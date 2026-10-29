import {beforeAll,beforeEach,afterAll,describe,it,expect} from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import {app,db} from '../src/index.ts';

const enabled=Boolean(process.env.TEST_DATABASE_URL);
describe.skipIf(!enabled)('API integration (requires TEST_DATABASE_URL)',()=>{
  let user,client,project,token;
  const email='integration@tracker.test';
  async function reset(){
    await db.invoice.deleteMany({where:{userId:user.id}});
    await db.timeEntry.deleteMany({where:{userId:user.id}});
    await db.activeTimer.deleteMany({where:{userId:user.id}});
    await db.project.deleteMany({where:{userId:user.id}});
    await db.client.deleteMany({where:{userId:user.id}});
    client=await db.client.create({data:{userId:user.id,name:'Test Client'}});
    project=await db.project.create({data:{userId:user.id,clientId:client.id,name:'Test Project',hourlyRate:'100.00',currency:'USD'}});
  }
  const auth=()=>({Authorization:`Bearer ${token}`});
  async function entry({billable=true,start='2026-10-26T10:00:00.000Z',seconds=3600}={}){
    const from=new Date(start),to=new Date(from.getTime()+seconds*1000);
    return db.timeEntry.create({data:{userId:user.id,projectId:project.id,startTime:from,endTime:to,durationSeconds:seconds,billable,hourlyRateSnapshot:'100.00',description:'Integration work'}});
  }
  beforeAll(async()=>{
    await db.$connect();
    user=await db.user.upsert({where:{email},update:{passwordHash:await bcrypt.hash('integration-password',4)},create:{email,passwordHash:await bcrypt.hash('integration-password',4)}});
    await reset();
    const login=await request(app).post('/api/auth/login').send({email,password:'integration-password'});
    token=login.body.data.token;
  });
  beforeEach(async()=>reset());
  afterAll(async()=>{if(user){await db.invoice.deleteMany({where:{userId:user.id}});await db.timeEntry.deleteMany({where:{userId:user.id}});await db.activeTimer.deleteMany({where:{userId:user.id}});await db.project.deleteMany({where:{userId:user.id}});await db.client.deleteMany({where:{userId:user.id}});await db.user.delete({where:{id:user.id}})}await db.$disconnect()});

  it('starts a timer for an owned project',async()=>{const r=await request(app).post('/api/timer/start').set(auth()).send({projectId:project.id});expect(r.status).toBe(201);expect(r.body.data.userId).toBe(user.id)});
  it('rejects a second active timer for the same user',async()=>{await request(app).post('/api/timer/start').set(auth()).send({projectId:project.id});const r=await request(app).post('/api/timer/start').set(auth()).send({projectId:project.id});expect(r.status).toBe(409)});
  it('returns persisted active timer state',async()=>{await request(app).post('/api/timer/start').set(auth()).send({projectId:project.id});const r=await request(app).get('/api/timer').set(auth());expect(r.status).toBe(200);expect(r.body.data.projectId).toBe(project.id)});
  it('stops a timer into exactly one time entry',async()=>{await request(app).post('/api/timer/start').set(auth()).send({projectId:project.id});expect((await request(app).post('/api/timer/stop').set(auth()).send({})).status).toBe(200);expect((await request(app).post('/api/timer/stop').set(auth()).send({})).status).toBe(409);expect(await db.timeEntry.count({where:{userId:user.id}})).toBe(1)});
  it('rejects invalid timer input',async()=>{const r=await request(app).post('/api/timer/start').set(auth()).send({projectId:42});expect(r.status).toBe(400)});
  it('calculates weekly totals from stored entries',async()=>{await entry({seconds:3600});await entry({seconds:1800,start:'2026-10-27T12:00:00.000Z',billable:false});const r=await request(app).get('/api/timesheet?weekStart=2026-10-28').set(auth());expect(r.status).toBe(200);expect(r.body.data.totals.seconds).toBe(5400);expect(r.body.data.totals.billableSeconds).toBe(3600)});
  it('invoices eligible billable entries and calculates totals on the server',async()=>{await entry({seconds:1800});const r=await request(app).post('/api/invoices').set(auth()).send({clientId:client.id,from:'2026-10-26',to:'2026-10-26'});expect(r.status).toBe(201);expect(Number(r.body.data.total)).toBe(50);expect(r.body.data.lines).toHaveLength(1)});
  it('excludes non-billable and already invoiced entries from preview',async()=>{await entry({seconds:1800});await entry({billable:false,seconds:3600,start:'2026-10-26T13:00:00.000Z'});await request(app).post('/api/invoices').set(auth()).send({clientId:client.id,from:'2026-10-26',to:'2026-10-26'});const r=await request(app).get(`/api/invoices/preview?clientId=${client.id}&from=2026-10-26&to=2026-10-26`).set(auth());expect(r.status).toBe(200);expect(r.body.data.entries).toHaveLength(0)});
  it('does not let a time entry appear on two invoices',async()=>{await entry();const payload={clientId:client.id,from:'2026-10-26',to:'2026-10-26'};expect((await request(app).post('/api/invoices').set(auth()).send(payload)).status).toBe(201);expect((await request(app).post('/api/invoices').set(auth()).send(payload)).status).toBe(409);expect(await db.invoiceLine.count()).toBe(1)});
  it('allows only one concurrent invoice request to claim an entry',async()=>{await entry();const payload={clientId:client.id,from:'2026-10-26',to:'2026-10-26'};const responses=await Promise.all([request(app).post('/api/invoices').set(auth()).send(payload),request(app).post('/api/invoices').set(auth()).send(payload)]);expect(responses.filter(r=>r.status===201)).toHaveLength(1);expect(responses.filter(r=>r.status===409)).toHaveLength(1);expect(await db.invoiceLine.count()).toBe(1)});
  it('protects private endpoints from unauthenticated access',async()=>{expect((await request(app).get('/api/entries')).status).toBe(401)});
});
