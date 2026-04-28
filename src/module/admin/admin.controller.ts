import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { NotificationService } from './notification.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  serveDashboard(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.buildHtml());
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в админ-панель' })
  login(@Body() body: { email: string; password: string }) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
    if (body.email !== adminEmail || body.password !== adminPassword) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const token = this.jwtService.sign(
      { email: adminEmail, isAdmin: true },
      { expiresIn: '12h' },
    );
    return { token };
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  getStats() { return this.adminService.getStats(); }

  @Get('users')
  @UseGuards(AdminGuard)
  getUsers() { return this.adminService.getUsers(); }

  @Delete('users/:id')
  @UseGuards(AdminGuard)
  deleteUser(@Param('id') id: string) { return this.adminService.deleteUser(Number(id)); }

  @Get('devices')
  @UseGuards(AdminGuard)
  getDevices() { return this.adminService.getDevices(); }

  @Delete('devices/:deviceId')
  @UseGuards(AdminGuard)
  deleteDevice(@Param('deviceId') deviceId: string) { return this.adminService.deleteDevice(deviceId); }

  @Get('unowned')
  @UseGuards(AdminGuard)
  getUnowned() { return this.adminService.getUnownedDevices(); }

  @Get('analytics')
  @UseGuards(AdminGuard)
  getAnalytics() { return this.adminService.getAnalytics(); }

  @Post('notify')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить push-уведомление' })
  async sendNotification(
    @Body() body: { title: string; message: string; userId?: number },
  ) {
    if (body.userId) {
      return this.notificationService.sendToUser(body.userId, body.title, body.message);
    }
    return this.notificationService.sendToAll(body.title, body.message);
  }

  private buildHtml(): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SunMind Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0f14;color:#e2e8f0;min-height:100vh}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-card{background:#171a1f;border:1px solid #2a2d35;border-radius:16px;padding:40px;width:360px}
.login-card h1{font-size:22px;font-weight:700;margin-bottom:6px;color:#f6c343}
.login-card p{color:#858a95;font-size:14px;margin-bottom:24px}
.panel{display:none}
.topbar{background:#171a1f;border-bottom:1px solid #2a2d35;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.topbar .logo{font-size:18px;font-weight:700;color:#f6c343}
.topbar button{background:transparent;border:1px solid #2a2d35;color:#858a95;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px}
.topbar button:hover{border-color:#f6c343;color:#f6c343}
.content{padding:24px;max-width:1400px;margin:0 auto}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:28px}
.stat-card{background:#171a1f;border:1px solid #2a2d35;border-radius:12px;padding:18px}
.stat-card.warn{border-color:#7c3228}
.stat-card .val{font-size:30px;font-weight:700;color:#f6c343}
.stat-card.warn .val{color:#f87171}
.stat-card .lbl{font-size:12px;color:#858a95;margin-top:4px}
.tabs{display:flex;gap:8px;margin-bottom:24px;border-bottom:1px solid #2a2d35}
.tab{padding:10px 20px;border:none;background:transparent;color:#858a95;cursor:pointer;font-size:14px;font-weight:500;border-bottom:2px solid transparent;margin-bottom:-1px}
.tab.active{color:#f6c343;border-bottom-color:#f6c343}
.section{display:none}
.section.active{display:block}
.tbl-wrap{overflow-x:auto;border-radius:12px;border:1px solid #2a2d35}
table{width:100%;border-collapse:collapse;background:#171a1f;min-width:700px}
th{padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:#858a95;text-transform:uppercase;border-bottom:1px solid #2a2d35;white-space:nowrap}
td{padding:11px 14px;font-size:13px;border-bottom:1px solid #1e2128;white-space:nowrap}
tr:last-child td{border-bottom:none}
tr:hover td{background:#1e2128}
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
.b-online{background:#14532d;color:#4ade80}
.b-offline{background:#2a1515;color:#f87171}
.b-google{background:#1e3a5f;color:#60a5fa}
.b-email{background:#2a2d35;color:#858a95}
.b-auto{background:#1a2e1a;color:#4ade80}
.b-manual{background:#2a2010;color:#f6c343}
.b-warn{background:#3f2010;color:#fb923c}
.del-btn{background:transparent;border:1px solid #3f1515;color:#f87171;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px}
.del-btn:hover{background:#3f1515}
input[type=email],input[type=password]{width:100%;padding:10px 14px;background:#0d0f14;border:1px solid #2a2d35;border-radius:8px;color:#e2e8f0;font-size:14px;margin-bottom:12px}
input:focus{outline:none;border-color:#f6c343}
.btn-primary{width:100%;padding:12px;background:#f6c343;color:#0d0f14;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer}
.btn-primary:hover{background:#e5b332}
.err{color:#f87171;font-size:13px;margin-top:8px;text-align:center}
.loading{color:#858a95;font-size:14px;padding:40px;text-align:center}
.refresh-btn{background:transparent;border:1px solid #2a2d35;color:#858a95;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;margin-bottom:14px}
.refresh-btn:hover{border-color:#f6c343;color:#f6c343}
.bat-bar{display:inline-block;width:40px;height:6px;background:#2a2d35;border-radius:3px;vertical-align:middle;margin-right:6px;overflow:hidden}
.bat-fill{height:100%;border-radius:3px}
.analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.analytics-grid.single{grid-template-columns:1fr}
@media(max-width:900px){.analytics-grid{grid-template-columns:1fr}}
.chart-card{background:#171a1f;border:1px solid #2a2d35;border-radius:12px;padding:20px}
.chart-card h3{font-size:14px;font-weight:600;color:#e2e8f0;margin-bottom:16px}
.chart-card canvas{max-height:220px}
.a-tables{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}
@media(max-width:1100px){.a-tables{grid-template-columns:1fr 1fr}}
@media(max-width:700px){.a-tables{grid-template-columns:1fr}}
.a-table-card{background:#171a1f;border:1px solid #2a2d35;border-radius:12px;overflow:hidden}
.a-table-card h3{font-size:13px;font-weight:600;color:#e2e8f0;padding:14px 16px;border-bottom:1px solid #2a2d35}
.a-table-card table{width:100%;border-collapse:collapse}
.a-table-card th{padding:8px 12px;font-size:11px;color:#858a95;text-transform:uppercase;border-bottom:1px solid #1e2128;text-align:left}
.a-table-card td{padding:9px 12px;font-size:13px;border-bottom:1px solid #1e2128}
.a-table-card tr:last-child td{border-bottom:none}
.a-table-card tr:hover td{background:#1e2128}
.rank{display:inline-block;width:20px;height:20px;background:#2a2d35;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:6px}
.notify-card{background:#171a1f;border:1px solid #2a2d35;border-radius:16px;padding:28px;max-width:560px}
.notify-card h2{font-size:17px;font-weight:700;margin-bottom:20px;color:#f6c343}
.notify-card label{display:block;font-size:12px;color:#858a95;margin-bottom:6px;margin-top:14px;text-transform:uppercase;font-weight:600}
.notify-card input,.notify-card textarea,.notify-card select{width:100%;padding:10px 14px;background:#0d0f14;border:1px solid #2a2d35;border-radius:8px;color:#e2e8f0;font-size:14px;font-family:inherit}
.notify-card textarea{height:90px;resize:vertical}
.notify-card input:focus,.notify-card textarea:focus,.notify-card select:focus{outline:none;border-color:#f6c343}
.send-btn{margin-top:20px;padding:12px 28px;background:#f6c343;color:#0d0f14;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer}
.send-btn:hover{background:#e5b332}
.send-btn:disabled{opacity:.5;cursor:not-allowed}
.notify-result{margin-top:14px;padding:12px 16px;border-radius:8px;font-size:14px}
.notify-result.ok{background:#14532d;color:#4ade80}
.notify-result.err{background:#3f1515;color:#f87171}
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>

<div class="login-wrap" id="loginWrap">
  <div class="login-card">
    <h1>SunMind Admin</h1>
    <p>Панель управления продуктом</p>
    <input type="email" id="email" placeholder="Email администратора">
    <input type="password" id="password" placeholder="Пароль">
    <button class="btn-primary" onclick="doLogin()">Войти</button>
    <div class="err" id="loginErr"></div>
  </div>
</div>

<div class="panel" id="panel">
  <div class="topbar">
    <span class="logo">SunMind Admin</span>
    <button onclick="logout()">Выйти</button>
  </div>
  <div class="content">
    <div class="stats" id="statsRow"><div class="loading">Загрузка...</div></div>
    <div class="tabs">
      <button class="tab active" onclick="showTab('devices')">Все устройства</button>
      <button class="tab" onclick="showTab('unowned')">Не привязанные</button>
      <button class="tab" onclick="showTab('users')">Пользователи</button>
      <button class="tab" onclick="showTab('analytics')">Аналитика</button>
      <button class="tab" onclick="showTab('notify')">Уведомления</button>
    </div>
    <div class="section active" id="tab-devices">
      <button class="refresh-btn" onclick="loadDevices()">Обновить</button>
      <div class="tbl-wrap" id="devicesTable"><div class="loading">Загрузка...</div></div>
    </div>
    <div class="section" id="tab-unowned">
      <button class="refresh-btn" onclick="loadUnowned()">Обновить</button>
      <div class="tbl-wrap" id="unownedTable"><div class="loading">Загрузка...</div></div>
    </div>
    <div class="section" id="tab-users">
      <button class="refresh-btn" onclick="loadUsers()">Обновить</button>
      <div class="tbl-wrap" id="usersTable"><div class="loading">Загрузка...</div></div>
    </div>
    <div class="section" id="tab-analytics">
      <button class="refresh-btn" onclick="loadAnalytics()">Обновить</button>
      <div id="analyticsWrap"><div class="loading">Загрузка...</div></div>
    </div>
    <div class="section" id="tab-notify">
      <div id="notifyWrap"></div>
    </div>
  </div>
</div>

<script>
let token = localStorage.getItem('admin_token');
if (token) showPanel();

async function doLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  document.getElementById('loginErr').textContent = '';
  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email, password}),
    });
    if (!res.ok) { document.getElementById('loginErr').textContent = 'Неверный email или пароль'; return; }
    const data = await res.json();
    localStorage.setItem('admin_token', data.token);
    token = data.token;
    showPanel();
  } catch { document.getElementById('loginErr').textContent = 'Ошибка подключения'; }
}

function showPanel() {
  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  loadStats(); loadDevices();
}

function logout() { localStorage.removeItem('admin_token'); location.reload(); }

function showTab(name) {
  const tabs = ['devices','unowned','users','analytics','notify'];
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', tabs[i] === name));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'users') loadUsers();
  if (name === 'devices') loadDevices();
  if (name === 'unowned') loadUnowned();
  if (name === 'analytics') loadAnalytics();
  if (name === 'notify') initNotify();
}

async function api(path) {
  const res = await fetch(path, {headers: {Authorization: 'Bearer ' + token}});
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

async function loadStats() {
  const d = await api('/admin/stats');
  if (!d) return;
  const cards = [
    {val: d.totalUsers,         lbl: 'Пользователей',        warn: false},
    {val: d.newUsersToday,      lbl: 'Новых сегодня',         warn: false},
    {val: d.totalDevices,       lbl: 'Устройств всего',       warn: false},
    {val: d.onlineDevices,      lbl: 'Онлайн сейчас',         warn: false},
    {val: d.totalZones,         lbl: 'Зон',                   warn: false},
    {val: d.unownedDevices,     lbl: 'Без владельца',         warn: d.unownedDevices > 0},
    {val: d.offlineOver24h,     lbl: 'Офлайн > 24 ч',        warn: d.offlineOver24h > 0},
    {val: d.lowBatteryDevices,  lbl: 'Низкий заряд (< 20%)', warn: d.lowBatteryDevices > 0},
  ];
  document.getElementById('statsRow').innerHTML = cards.map(c =>
    \`<div class="stat-card \${c.warn ? 'warn' : ''}">
      <div class="val">\${c.val}</div>
      <div class="lbl">\${c.lbl}</div>
    </div>\`
  ).join('');
}

function batHtml(pct) {
  if (pct === null) return '—';
  const color = pct < 20 ? '#f87171' : pct < 50 ? '#fb923c' : '#4ade80';
  const warn = pct < 20 ? ' b-warn' : '';
  return \`<span class="bat-bar"><span class="bat-fill" style="width:\${pct}%;background:\${color}"></span></span><span class="badge\${warn}">\${pct}%</span>\`;
}

async function loadDevices() {
  document.getElementById('devicesTable').innerHTML = '<div class="loading">Загрузка...</div>';
  const data = await api('/admin/devices');
  if (!data) return;
  if (!data.length) { document.getElementById('devicesTable').innerHTML = '<div class="loading">Устройств нет</div>'; return; }
  document.getElementById('devicesTable').innerHTML =
    \`<table><thead><tr>
      <th>ID</th><th>Название</th><th>Владелец</th><th>Зона</th>
      <th>Статус</th><th>Батарея</th><th>Яркость</th><th>Lux</th><th>Режим</th><th>Последняя связь</th><th></th>
    </tr></thead><tbody>\${data.map(d => \`<tr>
      <td style="font-family:monospace;color:#f6c343">\${d.deviceId}</td>
      <td>\${d.name ?? '—'}</td>
      <td>\${d.ownerEmail ?? '<span style="color:#858a95">—</span>'}</td>
      <td>\${d.zoneName ?? '—'}</td>
      <td><span class="badge \${d.online ? 'b-online' : 'b-offline'}">\${d.online ? 'Онлайн' : 'Офлайн'}</span></td>
      <td>\${batHtml(d.batteryPercent)}</td>
      <td>\${d.brightness !== null ? d.brightness : '—'}</td>
      <td>\${d.lux !== null ? d.lux + ' lx' : '—'}</td>
      <td><span class="badge \${d.manualMode ? 'b-manual' : 'b-auto'}">\${d.manualMode ? 'Ручной' : 'Авто'}</span></td>
      <td>\${d.lastSeen ? new Date(d.lastSeen).toLocaleString('ru') : '—'}</td>
      <td><button class="del-btn" onclick="delDevice('\${d.deviceId}')">Удалить</button></td>
    </tr>\`).join('')}</tbody></table>\`;
}

async function loadUnowned() {
  document.getElementById('unownedTable').innerHTML = '<div class="loading">Загрузка...</div>';
  const data = await api('/admin/unowned');
  if (!data) return;
  if (!data.length) { document.getElementById('unownedTable').innerHTML = '<div class="loading">Все устройства привязаны к пользователям</div>'; return; }
  document.getElementById('unownedTable').innerHTML =
    \`<table><thead><tr>
      <th>ID устройства</th><th>Статус</th><th>Батарея</th><th>Яркость</th><th>Lux</th><th>Последняя связь</th><th></th>
    </tr></thead><tbody>\${data.map(d => \`<tr>
      <td style="font-family:monospace;color:#f6c343">\${d.deviceId}</td>
      <td><span class="badge \${d.online ? 'b-online' : 'b-offline'}">\${d.online ? 'Онлайн' : 'Офлайн'}</span></td>
      <td>\${batHtml(d.batteryPercent)}</td>
      <td>\${d.brightness !== null ? d.brightness : '—'}</td>
      <td>\${d.lux !== null ? d.lux + ' lx' : '—'}</td>
      <td>\${d.lastSeen ? new Date(d.lastSeen).toLocaleString('ru') : '—'}</td>
      <td><button class="del-btn" onclick="delDevice('\${d.deviceId}')">Удалить</button></td>
    </tr>\`).join('')}</tbody></table>\`;
}

async function loadUsers() {
  document.getElementById('usersTable').innerHTML = '<div class="loading">Загрузка...</div>';
  const data = await api('/admin/users');
  if (!data) return;
  if (!data.length) { document.getElementById('usersTable').innerHTML = '<div class="loading">Пользователей нет</div>'; return; }
  document.getElementById('usersTable').innerHTML =
    \`<table><thead><tr>
      <th>ID</th><th>Имя</th><th>Email</th><th>Вход</th><th>Устройств</th><th>Зон</th><th>Регистрация</th><th></th>
    </tr></thead><tbody>\${data.map(u => \`<tr>
      <td>\${u.id}</td>
      <td>\${u.name}</td>
      <td>\${u.email}</td>
      <td><span class="badge \${u.authType === 'Google' ? 'b-google' : 'b-email'}">\${u.authType}</span></td>
      <td style="text-align:center">\${u.deviceCount}</td>
      <td style="text-align:center">\${u.zoneCount}</td>
      <td>\${new Date(u.createdAt).toLocaleString('ru')}</td>
      <td><button class="del-btn" onclick="delUser(\${u.id},'\${u.email}')">Удалить</button></td>
    </tr>\`).join('')}</tbody></table>\`;
}

async function delDevice(deviceId) {
  if (!confirm('Удалить устройство ' + deviceId + '?')) return;
  await fetch('/admin/devices/' + deviceId, {method:'DELETE', headers:{Authorization:'Bearer ' + token}});
  loadDevices(); loadStats(); loadUnowned();
}

async function delUser(id, email) {
  if (!confirm('Удалить пользователя ' + email + '?\\nЭто удалит все его данные.')) return;
  await fetch('/admin/users/' + id, {method:'DELETE', headers:{Authorization:'Bearer ' + token}});
  loadUsers(); loadStats();
}

let notifyUsers = [];
async function initNotify() {
  const users = await api('/admin/users');
  if (!users) return;
  notifyUsers = users;
  const opts = users.map(u => \`<option value="\${u.id}">\${u.name} (\${u.email})</option>\`).join('');
  document.getElementById('notifyWrap').innerHTML = \`
    <div class="notify-card">
      <h2>Отправить уведомление</h2>
      <label>Кому</label>
      <select id="notifyTarget">
        <option value="">Всем пользователям</option>
        \${opts}
      </select>
      <label>Заголовок</label>
      <input id="notifyTitle" placeholder="Например: Важное обновление">
      <label>Сообщение</label>
      <textarea id="notifyBody" placeholder="Текст уведомления..."></textarea>
      <button class="send-btn" id="sendBtn" onclick="sendNotify()">Отправить</button>
      <div id="notifyResult"></div>
    </div>\`;
}

async function sendNotify() {
  const title = document.getElementById('notifyTitle').value.trim();
  const message = document.getElementById('notifyBody').value.trim();
  const userId = document.getElementById('notifyTarget').value;
  const resultEl = document.getElementById('notifyResult');
  const btn = document.getElementById('sendBtn');

  if (!title || !message) { resultEl.className = 'notify-result err'; resultEl.textContent = 'Заполните заголовок и сообщение'; return; }

  btn.disabled = true;
  btn.textContent = 'Отправка...';
  resultEl.textContent = '';

  try {
    const body = { title, message };
    if (userId) body.userId = Number(userId);
    const res = await fetch('/admin/notify', {
      method: 'POST',
      headers: {'Content-Type':'application/json', Authorization: 'Bearer ' + token},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      resultEl.className = 'notify-result ok';
      resultEl.textContent = userId
        ? \`Отправлено: \${data.sent}, ошибок: \${data.failed}\`
        : \`Рассылка завершена. Отправлено: \${data.sent}, ошибок: \${data.failed}\`;
    } else {
      resultEl.className = 'notify-result err';
      resultEl.textContent = 'Ошибка отправки';
    }
  } catch { resultEl.className = 'notify-result err'; resultEl.textContent = 'Ошибка соединения'; }

  btn.disabled = false;
  btn.textContent = 'Отправить';
}

const chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

function fillDays(rows, days = 30) {
  const map = Object.fromEntries(rows.map(r => [r.date, r.count]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key.slice(5), count: map[key] ?? 0 });
  }
  return result;
}

function fillHours(rows) {
  const map = Object.fromEntries(rows.map(r => [r.hour, r.count]));
  return Array.from({length: 24}, (_, h) => ({ hour: h + 'h', count: map[h] ?? 0 }));
}

function makeChart(id, labels, datasets, type = 'line') {
  destroyChart(id);
  const ctx = document.getElementById(id).getContext('2d');
  chartInstances[id] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#858a95', boxWidth: 12 } } },
      scales: type !== 'doughnut' ? {
        x: { ticks: { color: '#858a95', maxRotation: 0, font: { size: 10 } }, grid: { color: '#1e2128' } },
        y: { ticks: { color: '#858a95', font: { size: 10 } }, grid: { color: '#1e2128' }, beginAtZero: true },
      } : {},
    },
  });
}

async function loadAnalytics() {
  document.getElementById('analyticsWrap').innerHTML = '<div class="loading">Загрузка...</div>';
  const d = await api('/admin/analytics');
  if (!d) return;

  const users30 = fillDays(d.usersByDay);
  const devices30 = fillDays(d.activeDevicesByDay);
  const hours = fillHours(d.devicesByHour);

  document.getElementById('analyticsWrap').innerHTML = \`
    <div class="analytics-grid">
      <div class="chart-card"><h3>Регистрации пользователей (30 дней)</h3><canvas id="chartUsers"></canvas></div>
      <div class="chart-card"><h3>Активные устройства по дням (30 дней)</h3><canvas id="chartDevices"></canvas></div>
    </div>
    <div class="analytics-grid single">
      <div class="chart-card"><h3>Активность устройств по часам сегодня</h3><canvas id="chartHours"></canvas></div>
    </div>
    <div class="a-tables">
      <div class="a-table-card">
        <h3>Топ пользователей</h3>
        <table><thead><tr><th>#</th><th>Пользователь</th><th>Устройств</th></tr></thead>
        <tbody>\${d.topUsers.map((u,i) => \`<tr>
          <td><span class="rank">\${i+1}</span></td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">\${u.name}<br><span style="color:#858a95;font-size:11px">\${u.email}</span></td>
          <td style="color:#f6c343;font-weight:700">\${u.deviceCount}</td>
        </tr>\`).join('')}</tbody></table>
      </div>
      <div class="a-table-card">
        <h3>Самые активные устройства (7 дней)</h3>
        <table><thead><tr><th>#</th><th>ID устройства</th><th>Записей</th></tr></thead>
        <tbody>\${d.mostActiveDevices.map((d2,i) => \`<tr>
          <td><span class="rank">\${i+1}</span></td>
          <td style="font-family:monospace;color:#f6c343">\${d2.deviceId}<br><span style="color:#858a95;font-size:11px">\${d2.name ?? '—'}</span></td>
          <td style="font-weight:700">\${d2.records}</td>
        </tr>\`).join('')}</tbody></table>
      </div>
      <div class="a-table-card">
        <h3>Низкий заряд батареи</h3>
        <table><thead><tr><th>Устройство</th><th>Заряд</th></tr></thead>
        <tbody>\${d.lowBattery.map(b => \`<tr>
          <td style="font-family:monospace;color:#f6c343">\${b.deviceId}<br><span style="color:#858a95;font-size:11px">\${b.name ?? '—'}</span></td>
          <td>\${batHtml(b.batteryPercent)}</td>
        </tr>\`).join('')}</tbody></table>
      </div>
    </div>\`;

  makeChart('chartUsers', users30.map(r => r.date), [{
    label: 'Новых пользователей', data: users30.map(r => r.count),
    borderColor: '#f6c343', backgroundColor: 'rgba(246,195,67,0.1)', fill: true, tension: 0.4, pointRadius: 2,
  }]);

  makeChart('chartDevices', devices30.map(r => r.date), [{
    label: 'Активных устройств', data: devices30.map(r => r.count),
    borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)', fill: true, tension: 0.4, pointRadius: 2,
  }]);

  makeChart('chartHours', hours.map(r => r.hour), [{
    label: 'Устройств онлайн', data: hours.map(r => r.count),
    backgroundColor: 'rgba(74,222,128,0.7)', borderColor: '#4ade80', borderWidth: 1,
  }], 'bar');
}

document.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
</script>
</body>
</html>`;
  }
}
