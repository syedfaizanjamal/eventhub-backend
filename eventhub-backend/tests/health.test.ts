import request from 'supertest';
import app from '../src/app';

describe('Health Check', () => {
  it('should return 200 OK and API running message', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('EventHub API is running');
  });
});
