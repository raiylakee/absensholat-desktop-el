import * as http from 'http';
import { URL } from 'url';

export type RequestInfo = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: any;
};

export type MockHandler = (req: RequestInfo, res: http.ServerResponse) => void;

export class MockApiServer {
  private server: http.Server;
  private port: number = 0;
  private routes: Map<string, { method: string; pattern: RegExp; handler: MockHandler }> = new Map();
  public requests: RequestInfo[] = [];

  constructor() {
    this.server = http.createServer((req, res) => {
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk;
      });

      req.on('end', () => {
        let body: any = null;
        try {
          if (bodyData && req.headers['content-type']?.includes('application/json')) {
            body = JSON.parse(bodyData);
          } else {
            body = bodyData;
          }
        } catch (e) {
          body = bodyData;
        }

        const requestInfo: RequestInfo = {
          method: req.method || 'GET',
          url: req.url || '/',
          headers: req.headers,
          body,
        };

        this.requests.push(requestInfo);
        this.handleRequest(requestInfo, res);
      });
    });
  }

  public async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
          resolve(`http://127.0.0.1:${this.port}`);
        } else {
          resolve('http://127.0.0.1:0');
        }
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public clearRequests(): void {
    this.requests = [];
  }

  public mockRoute(method: string, pathPattern: string | RegExp, handler: MockHandler): void {
    const key = `${method}:${pathPattern.toString()}`;
    const pattern = typeof pathPattern === 'string' ? new RegExp(`^${pathPattern}$`) : pathPattern;
    this.routes.set(key, { method, pattern, handler });
  }

  private handleRequest(req: RequestInfo, res: http.ServerResponse): void {
    // Add default CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hardware-ID');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://localhost`);
    const pathName = parsedUrl.pathname;

    for (const [, route] of this.routes) {
      if (route.method === req.method && route.pattern.test(pathName)) {
        try {
          route.handler(req, res);
          return;
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          return;
        }
      }
    }

    // Default Fallback Routing
    this.handleDefaultFallback(req, pathName, res);
  }

  private handleDefaultFallback(req: RequestInfo, pathName: string, res: http.ServerResponse): void {
    const respondJson = (status: number, data: any) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // 1. Authentication Sessions (POST)
    if (req.method === 'POST' && pathName === '/api/v2/auth/sessions') {
      const identifier = req.body?.identifier || '';
      let role = 'siswa';
      let name = 'Ahmad Siswa';
      let permissions = ['siswa'];

      if (identifier.includes('@') || identifier.includes('admin')) {
        role = 'admin';
        name = 'Super Admin';
        permissions = ['admin'];
      } else if (/^\d{9,18}$/.test(identifier) || identifier.includes('guru') || identifier.includes('wali')) {
        role = 'guru';
        name = 'Pak Guru';
        permissions = ['guru'];
      } else {
        role = 'siswa';
        name = 'Ahmad Siswa';
        permissions = ['siswa'];
      }

      respondJson(200, {
        status: 'success',
        data: {
          token: `token-${role}-123`,
          user: {
            id: 'user-id-1',
            identifier,
            name,
            role,
            permissions,
          },
        },
      });
      return;
    }

    // 2. Get Profile (GET)
    if (req.method === 'GET' && pathName === '/api/v2/auth/profile') {
      const authHeader = req.headers['authorization'] || '';
      let role = 'siswa';
      let name = 'Ahmad Siswa';

      if (authHeader.includes('admin')) {
        role = 'admin';
        name = 'Super Admin';
      } else if (authHeader.includes('guru')) {
        role = 'guru';
        name = 'Pak Guru';
      }

      respondJson(200, {
        status: 'success',
        data: {
          id: 'user-id-1',
          identifier: `${role}123`,
          name,
          role,
          email: `${role}@sekolah.id`,
          nis: role === 'siswa' ? '2401001' : undefined,
          nip: role === 'guru' ? '19870605001' : undefined,
          kelas: role === 'siswa' ? { id: 1, nama: 'XI RPL 1' } : undefined,
          jurusan: role === 'siswa' ? { id: 1, nama: 'RPL', deskripsi: 'Rekayasa Perangkat Lunak' } : undefined,
          jenis_kelamin: 'Laki-laki',
        },
      });
      return;
    }

    // 3. Close Session (DELETE)
    if (req.method === 'DELETE' && pathName === '/api/v2/auth/sessions/current') {
      respondJson(200, { status: 'success', message: 'Logout berhasil' });
      return;
    }

    // 4. Analytics & Charts
    if (req.method === 'GET' && pathName === '/api/v2/analytics/charts') {
      respondJson(200, [
        { tanggal: '2026-06-01', hadir: 95, izin: 3, alfa: 2 },
        { tanggal: '2026-06-02', hadir: 97, izin: 2, alfa: 1 },
        { tanggal: '2026-06-03', hadir: 94, izin: 4, alfa: 2 },
        { tanggal: '2026-06-04', hadir: 98, izin: 1, alfa: 1 },
        { tanggal: '2026-06-05', hadir: 96, izin: 2, alfa: 2 },
      ]);
      return;
    }

    // 5. Attendance statistics
    if (req.method === 'GET' && pathName === '/api/v2/analytics/attendance') {
      respondJson(200, {
        hadir: 420,
        izin: 12,
        alfa: 8,
        total: 440,
        persentase_kehadiran: 95.45,
      });
      return;
    }

    // 6. Closest Prayer Time
    if (req.method === 'GET' && pathName === '/api/v2/prayer-schedules/closest') {
      respondJson(200, {
        id_jadwal: 1,
        nama_sholat: 'Dzuhur',
        waktu_mulai: '12:00',
        waktu_selesai: '12:30',
        status: 'active',
      });
      return;
    }

    // 7. General list routes
    if (req.method === 'GET' && pathName === '/api/v2/kelas') {
      respondJson(200, [
        { id_kelas: 1, nama_kelas: 'XI RPL 1' },
        { id_kelas: 2, nama_kelas: 'XI RPL 2' },
        { id_kelas: 3, nama_kelas: 'XI DKV 1' },
      ]);
      return;
    }

    if (req.method === 'GET' && pathName === '/api/v2/jurusan') {
      respondJson(200, [
        { id_jurusan: 1, nama_jurusan: 'RPL', deskripsi: 'Rekayasa Perangkat Lunak' },
        { id_jurusan: 2, nama_jurusan: 'DKV', deskripsi: 'Desain Komunikasi Visual' },
      ]);
      return;
    }

    if (req.method === 'GET' && pathName === '/api/v2/prayer-types') {
      respondJson(200, [
        { id_tipe: 1, nama_tipe: 'Dzuhur', wajib: true },
        { id_tipe: 2, nama_tipe: 'Ashar', wajib: true },
        { id_tipe: 3, nama_tipe: 'Dhuha', wajib: false },
      ]);
      return;
    }

    if (req.method === 'GET' && pathName === '/api/v2/academic-years') {
      respondJson(200, [
        { id_tahun: 1, tahun_ajaran: '2025/2026', aktif: true },
        { id_tahun: 2, tahun_ajaran: '2026/2027', aktif: false },
      ]);
      return;
    }

    if (req.method === 'GET' && pathName === '/api/v2/notifications') {
      respondJson(200, [
        { id: '1', title: 'Info Presensi', message: 'Presensi Dzuhur dibuka.', created_at: '2026-06-05T12:00:00Z', read: false },
      ]);
      return;
    }

    // 8. Device Auth info
    if (req.method === 'GET' && pathName === '/api/v2/device-auth/info') {
      respondJson(200, {
        registered: true,
        device: {
          id: 'dev-1',
          hardware_id: req.headers['x-hardware-id'] || 'test-hwid',
          name: 'Device E2E Tester',
          status: 'authorized',
        },
      });
      return;
    }

    if (req.method === 'POST' && pathName === '/api/v2/device-auth/register') {
      respondJson(200, { status: 'success', message: 'Perangkat berhasil didaftarkan' });
      return;
    }

    // 404 Route Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Mock endpoint ${req.method} ${pathName} not found` }));
  }
}
