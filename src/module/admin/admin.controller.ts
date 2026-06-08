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
  Logger,
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
  private readonly logger = new Logger(AdminController.name);

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

  @Post('devices/:deviceId/location')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Установить координаты устройства' })
  setLocation(
    @Param('deviceId') deviceId: string,
    @Body() body: { latitude: number; longitude: number },
  ) { return this.adminService.setDeviceLocation(deviceId, body.latitude, body.longitude); }

  @Post('devices/:deviceId/icon')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Установить иконку устройства' })
  setIcon(
    @Param('deviceId') deviceId: string,
    @Body() body: { icon: string },
  ) { return this.adminService.setDeviceIcon(deviceId, body.icon); }

  @Post('devices/:deviceId/on')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Включить устройство' })
  turnOn(@Param('deviceId') deviceId: string) {
    return this.adminService.turnOnDevice(deviceId);
  }

  @Post('devices/:deviceId/off')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выключить устройство' })
  turnOff(@Param('deviceId') deviceId: string) {
    return this.adminService.turnOffDevice(deviceId);
  }

  @Post('devices/:deviceId/brightness')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Установить яркость устройства' })
  setBrightness(
    @Param('deviceId') deviceId: string,
    @Body() body: { value: number },
  ) { return this.adminService.setDeviceBrightness(deviceId, body.value); }

  @Post('devices/:deviceId/mode')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Установить режим устройства (manual/auto)' })
  setMode(
    @Param('deviceId') deviceId: string,
    @Body() body: { mode: 'manual' | 'auto' },
  ) { return this.adminService.setDeviceMode(deviceId, body.mode); }

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
    try {
      if (body?.userId) {
        return await this.notificationService.sendToUser(body.userId, body.title, body.message);
      }
      return await this.notificationService.sendToAll(body?.title ?? '', body?.message ?? '');
    } catch (err: any) {
      this.logger.error(`sendNotification failed: ${err?.stack ?? err?.message ?? String(err)}`);
      return { sent: 0, failed: 0, error: err?.message ?? 'unknown' };
    }
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
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0f14;color:#e2e8f0;height:100vh;overflow:hidden}
/* Login */
.login-wrap{display:flex;align-items:center;justify-content:center;height:100vh}
.login-card{background:#171a1f;border:1px solid #2a2d35;border-radius:16px;padding:40px;width:360px}
.login-card h1{font-size:22px;font-weight:700;margin-bottom:6px;color:#f6c343}
.login-card p{color:#858a95;font-size:14px;margin-bottom:24px}
/* Panel */
.panel{display:none;height:100vh}
.panel.visible{display:flex}
.app-layout{display:flex;width:100%;height:100%;overflow:hidden}
/* Sidebar */
.sidebar{width:230px;background:#111318;border-right:1px solid #2a2d35;display:flex;flex-direction:column;flex-shrink:0}
.sidebar-logo{padding:22px 18px 18px;border-bottom:1px solid #2a2d35}
.sidebar-logo .logo-text{font-size:17px;font-weight:700;color:#f6c343}
.sidebar-logo .logo-sub{font-size:11px;color:#858a95;margin-top:3px}
.sidebar-nav{flex:1;padding:10px 8px;overflow-y:auto}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:13px;color:#858a95;border:none;background:transparent;width:100%;text-align:left;transition:background .15s,color .15s;margin-bottom:2px}
.nav-item:hover{background:#1e2128;color:#e2e8f0}
.nav-item.active{background:#1e2128;color:#f6c343}
.nav-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0}
.nav-label{font-weight:500}
.sidebar-footer{padding:12px 8px;border-top:1px solid #2a2d35}
.server-tag{font-size:10px;color:#858a95;padding:6px 10px;background:#1e2128;border-radius:8px;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.logout-btn{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border-radius:10px;border:none;background:transparent;color:#858a95;font-size:13px;cursor:pointer;transition:background .15s,color .15s;font-weight:500}
.logout-btn:hover{background:#3f1515;color:#f87171}
/* Main */
.main-content{flex:1;overflow-y:auto;background:#0d0f14}
.content{padding:24px;max-width:1400px}
/* Stats */
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-bottom:28px}
.stat-card{background:#171a1f;border:1px solid #2a2d35;border-radius:12px;padding:18px}
.stat-card.warn{border-color:#7c3228}
.stat-card .val{font-size:30px;font-weight:700;color:#f6c343}
.stat-card.warn .val{color:#f87171}
.stat-card .lbl{font-size:12px;color:#858a95;margin-top:4px}
/* Page header */
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.page-header h2{font-size:17px;font-weight:700;color:#e2e8f0}
/* Sections */
.section{display:none}
.section.active{display:block}
/* Tables */
.tbl-wrap{overflow-x:auto;border-radius:12px;border:1px solid #2a2d35}
table{width:100%;border-collapse:collapse;background:#171a1f;min-width:700px}
th{padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:#858a95;text-transform:uppercase;border-bottom:1px solid #2a2d35;white-space:nowrap}
td{padding:11px 14px;font-size:13px;border-bottom:1px solid #1e2128;white-space:nowrap}
tr:last-child td{border-bottom:none}
tr:hover td{background:#1e2128}
/* Badges */
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
.b-online{background:#14532d;color:#4ade80}
.b-offline{background:#2a1515;color:#f87171}
.b-google{background:#1e3a5f;color:#60a5fa}
.b-email{background:#2a2d35;color:#858a95}
.b-auto{background:#1a2e1a;color:#4ade80}
.b-manual{background:#2a2010;color:#f6c343}
.b-warn{background:#3f2010;color:#fb923c}
/* Buttons */
.del-btn{background:transparent;border:1px solid #3f1515;color:#f87171;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px}
.del-btn:hover{background:#3f1515}
.ctrl-btn{background:transparent;border:1px solid #2a2d35;color:#e2e8f0;padding:3px 8px;border-radius:6px;cursor:pointer;font-size:11px;transition:all .15s}
.ctrl-btn:hover{border-color:#f6c343;color:#f6c343}
.ctrl-btn.on{border-color:#14532d;color:#4ade80}
.ctrl-btn.off{border-color:#3f1515;color:#f87171}
.ctrl-btn.manual{border-color:#7c5e10;color:#f6c343}
.ctrl-btn.auto{border-color:#1a2e1a;color:#4ade80}
.ctrl-sep{color:#2a2d35;margin:0 2px}
input[type=range].brt-slider{width:80px;accent-color:#f6c343;cursor:pointer;vertical-align:middle}
input[type=email],input[type=password],input[type=text]{width:100%;padding:10px 14px;background:#0d0f14;border:1px solid #2a2d35;border-radius:8px;color:#e2e8f0;font-size:14px;margin-bottom:12px}
input:focus{outline:none;border-color:#f6c343}
.srv-btn{padding:6px 14px;border:1px solid #2a2d35;background:transparent;color:#858a95;border-radius:8px;cursor:pointer;font-size:13px;transition:all .15s}
.srv-btn.active{border-color:#f6c343;color:#f6c343}
.srv-btn:hover{border-color:#f6c343;color:#f6c343}
.btn-primary{width:100%;padding:12px;background:#f6c343;color:#0d0f14;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer}
.btn-primary:hover{background:#e5b332}
.err{color:#f87171;font-size:13px;margin-top:8px;text-align:center}
.loading{color:#858a95;font-size:14px;padding:40px;text-align:center}
.refresh-btn{background:transparent;border:1px solid #2a2d35;color:#858a95;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px}
.refresh-btn:hover{border-color:#f6c343;color:#f6c343}
.bat-bar{display:inline-block;width:40px;height:6px;background:#2a2d35;border-radius:3px;vertical-align:middle;margin-right:6px;overflow:hidden}
.bat-fill{height:100%;border-radius:3px}
/* Analytics */
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
/* Notify */
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
/* Map */
.map-wrap{position:relative}
#mapContainer{height:480px;border-radius:12px;overflow:hidden;border:1px solid #2a2d35;cursor:grab}
#mapContainer.placing{cursor:crosshair}
.map-legend{display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap}
.map-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:#858a95}
.map-legend-dot{width:12px;height:12px;border-radius:50%}
.map-placing-banner{display:none;position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:1000;background:#f6c343;color:#0d0f14;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;box-shadow:0 2px 12px rgba(246,195,67,.5);white-space:nowrap}
.map-placing-banner.visible{display:block}
.device-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-top:22px}
.device-card{border-radius:16px;padding:0;overflow:hidden;transition:transform .15s,box-shadow .15s;cursor:default}
.device-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.4)}
.device-card.active{box-shadow:0 0 0 3px #f6c343,0 8px 24px rgba(246,195,67,.3)}
.dc-top{padding:18px 16px 14px;position:relative;min-height:90px}
.dc-icon{font-size:28px;margin-bottom:8px;display:block}
.dc-name{font-size:13px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-id{font-size:10px;color:rgba(255,255,255,.6);font-family:monospace;margin-top:2px}
.dc-status{position:absolute;top:14px;right:14px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;background:rgba(0,0,0,.3);color:#fff}
.dc-bottom{padding:12px 16px;background:rgba(0,0,0,.25)}
.dc-meta{font-size:11px;color:rgba(255,255,255,.7);margin-bottom:3px}
.dc-coords{font-size:10px;color:rgba(255,255,255,.5);font-family:monospace;margin-bottom:10px;min-height:14px}
.place-btn{width:100%;padding:8px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.place-btn.idle{background:rgba(255,255,255,.15);color:#fff}
.place-btn.idle:hover{background:rgba(255,255,255,.25)}
.place-btn.placing{background:#f6c343;color:#0d0f14}
.place-btn.placed{background:rgba(255,255,255,.15);color:#fff}
.place-btn.placed:hover{background:#f6c343;color:#0d0f14}
/* Icon picker */
.icon-picker-popup{display:none;position:absolute;z-index:2000;background:#171a1f;border:1px solid #2a2d35;border-radius:12px;padding:10px;box-shadow:0 8px 32px rgba(0,0,0,.6);width:220px;flex-wrap:wrap;gap:6px}
.icon-picker-popup.open{display:flex}
.icon-opt{font-size:22px;cursor:pointer;padding:5px;border-radius:8px;transition:background .1s;line-height:1;border:2px solid transparent}
.icon-opt:hover{background:#2a2d35;border-color:#f6c343}
.icon-opt.selected{border-color:#f6c343;background:#2a2d35}
.dc-icon{cursor:pointer;display:block;font-size:28px;margin-bottom:8px;transition:transform .15s;position:relative}
.dc-icon:hover{transform:scale(1.2)}
/* Location modal */
.loc-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;align-items:center;justify-content:center}
.loc-modal.open{display:flex}
.loc-card{background:#171a1f;border:1px solid #2a2d35;border-radius:16px;padding:28px;width:540px;max-width:96vw}
#locMapContainer{height:280px;border-radius:10px;overflow:hidden;border:1px solid #2a2d35;margin-bottom:14px}
.loc-hint{font-size:11px;color:#858a95;margin-top:6px;margin-bottom:10px}
.loc-card h3{font-size:16px;font-weight:700;color:#f6c343;margin-bottom:18px}
.loc-card label{display:block;font-size:11px;color:#858a95;text-transform:uppercase;font-weight:600;margin-bottom:5px;margin-top:12px}
.loc-card input{width:100%;padding:9px 12px;background:#0d0f14;border:1px solid #2a2d35;border-radius:8px;color:#e2e8f0;font-size:14px}
.loc-card input:focus{outline:none;border-color:#f6c343}
.loc-actions{display:flex;gap:10px;margin-top:20px}
.loc-save{flex:1;padding:11px;background:#f6c343;color:#0d0f14;border:none;border-radius:8px;font-weight:700;cursor:pointer}
.loc-save:hover{background:#e5b332}
.loc-cancel{flex:1;padding:11px;background:transparent;color:#858a95;border:1px solid #2a2d35;border-radius:8px;cursor:pointer}
.loc-cancel:hover{border-color:#f6c343;color:#f6c343}
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>

<div class="login-wrap" id="loginWrap">
  <div class="login-card">
    <h1>SunMind Admin</h1>
    <p>Панель управления продуктом</p>
    <div style="margin-bottom:4px">
      <div style="font-size:11px;color:#858a95;font-weight:600;text-transform:uppercase;margin-bottom:8px">Сервер</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button type="button" class="srv-btn active" id="btnProd" onclick="selectServer(this,'https://sunmindthebestbackend-production.up.railway.app')">Продакшн</button>
        <button type="button" class="srv-btn" id="btnLocal" onclick="selectServer(this,'http://localhost:5001')">Локальный</button>
      </div>
      <input type="text" id="serverUrl" placeholder="https://sunmindthebestbackend-production.up.railway.app">
    </div>
    <input type="email" id="email" placeholder="Email администратора">
    <input type="password" id="password" placeholder="Пароль">
    <button class="btn-primary" onclick="doLogin()">Войти</button>
    <div class="err" id="loginErr"></div>
  </div>
</div>

<div class="panel" id="panel">
  <div class="app-layout">
    <nav class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-text">SunMind Admin</div>
        <div class="logo-sub">Панель управления</div>
      </div>
      <div class="sidebar-nav">
        <button class="nav-item active" data-tab="devices" onclick="showTab('devices')">
          <span class="nav-icon">&#128225;</span>
          <span class="nav-label">Все устройства</span>
        </button>
        <button class="nav-item" data-tab="unowned" onclick="showTab('unowned')">
          <span class="nav-icon">&#128279;</span>
          <span class="nav-label">Не привязанные</span>
        </button>
        <button class="nav-item" data-tab="users" onclick="showTab('users')">
          <span class="nav-icon">&#128101;</span>
          <span class="nav-label">Пользователи</span>
        </button>
        <button class="nav-item" data-tab="analytics" onclick="showTab('analytics')">
          <span class="nav-icon">&#128202;</span>
          <span class="nav-label">Аналитика</span>
        </button>
        <button class="nav-item" data-tab="notify" onclick="showTab('notify')">
          <span class="nav-icon">&#128276;</span>
          <span class="nav-label">Уведомления</span>
        </button>
        <button class="nav-item" data-tab="map" onclick="showTab('map')">
          <span class="nav-icon">&#128506;</span>
          <span class="nav-label">Карта</span>
        </button>
      </div>
      <div class="sidebar-footer">
        <span class="server-tag" id="serverLabel"></span>
        <button class="logout-btn" onclick="logout()">
          <span>&#10548;</span> Выйти
        </button>
      </div>
    </nav>

    <div class="main-content">
      <div class="content">
        <div class="stats" id="statsRow"><div class="loading">Загрузка...</div></div>

        <div class="section active" id="tab-devices">
          <div class="page-header">
            <h2>Все устройства</h2>
            <button class="refresh-btn" onclick="loadDevices()">&#8635; Обновить</button>
          </div>
          <div class="tbl-wrap" id="devicesTable"><div class="loading">Загрузка...</div></div>
        </div>

        <div class="section" id="tab-unowned">
          <div class="page-header">
            <h2>Не привязанные устройства</h2>
            <button class="refresh-btn" onclick="loadUnowned()">&#8635; Обновить</button>
          </div>
          <div class="tbl-wrap" id="unownedTable"><div class="loading">Загрузка...</div></div>
        </div>

        <div class="section" id="tab-users">
          <div class="page-header">
            <h2>Пользователи</h2>
            <button class="refresh-btn" onclick="loadUsers()">&#8635; Обновить</button>
          </div>
          <div class="tbl-wrap" id="usersTable"><div class="loading">Загрузка...</div></div>
        </div>

        <div class="section" id="tab-analytics">
          <div class="page-header">
            <h2>Аналитика</h2>
            <button class="refresh-btn" onclick="loadAnalytics()">&#8635; Обновить</button>
          </div>
          <div id="analyticsWrap"><div class="loading">Загрузка...</div></div>
        </div>

        <div class="section" id="tab-notify">
          <div class="page-header"><h2>Уведомления</h2></div>
          <div id="notifyWrap"></div>
        </div>

        <div class="section" id="tab-map">
          <div class="page-header">
            <h2>Карта устройств</h2>
            <span id="mapLastUpdated" style="font-size:12px;color:#858a95;margin-left:auto;margin-right:12px"></span>
            <button class="refresh-btn" onclick="loadMap()">&#8635; Обновить</button>
          </div>
          <div class="map-legend">
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#4ade80"></div>Онлайн</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#fb923c"></div>Низкий заряд</div>
            <div class="map-legend-item"><div class="map-legend-dot" style="background:#f87171"></div>Офлайн</div>
          </div>
          <div class="map-wrap">
            <div id="mapPlacingBanner" class="map-placing-banner"></div>
            <div id="mapContainer"></div>
          </div>
          <div class="device-cards" id="mapDeviceCards"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="iconPickerPopup" class="icon-picker-popup"></div>

<div class="loc-modal" id="locModal">
  <div class="loc-card">
    <h3 id="locModalTitle">Координаты устройства</h3>
    <div id="locMapContainer"></div>
    <p class="loc-hint">Кликните на карту или введите координаты вручную</p>
    <div style="display:flex;gap:12px">
      <div style="flex:1">
        <label>Широта (Latitude)</label>
        <input type="number" id="locLat" placeholder="42.8746" step="0.000001" oninput="locMoveMarker()">
      </div>
      <div style="flex:1">
        <label>Долгота (Longitude)</label>
        <input type="number" id="locLng" placeholder="74.5698" step="0.000001" oninput="locMoveMarker()">
      </div>
    </div>
    <div class="loc-actions">
      <button class="loc-cancel" onclick="closeLocModal()">Отмена</button>
      <button class="loc-save" onclick="saveLocation()">Сохранить</button>
    </div>
  </div>
</div>

<script>
let BASE_URL = localStorage.getItem('admin_server') || 'https://sunmindthebestbackend-production.up.railway.app';
let token = localStorage.getItem('admin_token');

function selectServer(btn, url) {
  document.querySelectorAll('.srv-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('serverUrl').value = url;
}

(function initServerInput() {
  const inp = document.getElementById('serverUrl');
  if (inp) {
    inp.value = BASE_URL;
    if (BASE_URL === 'https://sunmindthebestbackend-production.up.railway.app') {
      document.getElementById('btnProd')?.classList.add('active');
      document.getElementById('btnLocal')?.classList.remove('active');
    } else if (BASE_URL === 'http://localhost:5001') {
      document.getElementById('btnLocal')?.classList.add('active');
      document.getElementById('btnProd')?.classList.remove('active');
    }
  }
})();

if (token) showPanel();

async function doLogin() {
  const raw = document.getElementById('serverUrl').value.trim();
  BASE_URL = (raw || 'https://sunmindthebestbackend-production.up.railway.app').replace(/\\/$/, '');
  localStorage.setItem('admin_server', BASE_URL);
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  document.getElementById('loginErr').textContent = '';
  try {
    const res = await fetch(BASE_URL + '/admin/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email, password}),
    });
    if (!res.ok) { document.getElementById('loginErr').textContent = 'Неверный email или пароль'; return; }
    const data = await res.json();
    localStorage.setItem('admin_token', data.token);
    token = data.token;
    showPanel();
  } catch { document.getElementById('loginErr').textContent = 'Ошибка подключения к ' + BASE_URL; }
}

function showPanel() {
  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('panel').classList.add('visible');
  document.getElementById('serverLabel').textContent = BASE_URL;
  loadStats(); loadDevices();
}

function logout() { stopMapPolling(); localStorage.removeItem('admin_token'); location.reload(); }

function showTab(name) {
  document.querySelectorAll('.nav-item').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'users') loadUsers();
  if (name === 'devices') loadDevices();
  if (name === 'unowned') loadUnowned();
  if (name === 'analytics') loadAnalytics();
  if (name === 'notify') initNotify();
  if (name === 'map') { loadMap(); startMapPolling(); } else stopMapPolling();
}

async function api(path) {
  const res = await fetch(BASE_URL + path, {headers: {Authorization: 'Bearer ' + token}});
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
      <th>Статус</th><th>Батарея</th><th>Яркость</th><th>Lux</th><th>Режим</th><th>Последняя связь</th><th>Управление</th><th></th>
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
      <td style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;min-width:260px">
        <button class="ctrl-btn on" onclick="ctrlDevice('\${d.deviceId}','on')">ВКЛ</button>
        <button class="ctrl-btn off" onclick="ctrlDevice('\${d.deviceId}','off')">ВЫКЛ</button>
        <span class="ctrl-sep">|</span>
        <input type="range" class="brt-slider" min="0" max="255" value="\${d.brightness ?? 128}"
          onchange="ctrlBrightness('\${d.deviceId}',this.value)" title="Яркость">
        <span class="ctrl-sep">|</span>
        <button class="ctrl-btn \${d.manualMode ? 'auto' : 'manual'}" onclick="ctrlMode('\${d.deviceId}','\${d.manualMode ? 'auto' : 'manual'}')">\${d.manualMode ? '→ Авто' : '→ Ручной'}</button>
      </td>
      <td style="display:flex;gap:6px">
        <button class="del-btn" style="border-color:#1e3a5f;color:#60a5fa" onclick="openLocModal('\${d.deviceId}',\${JSON.stringify(d.name ?? d.deviceId)},\${d.latitude},\${d.longitude})">\${d.latitude != null ? '📍' : '＋'} Координаты</button>
        <button class="del-btn" onclick="delDevice('\${d.deviceId}')">Удалить</button>
      </td>
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

async function ctrlDevice(deviceId, action) {
  await fetch(BASE_URL + '/admin/devices/' + encodeURIComponent(deviceId) + '/' + action, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token },
  });
}

async function ctrlBrightness(deviceId, value) {
  await fetch(BASE_URL + '/admin/devices/' + encodeURIComponent(deviceId) + '/brightness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ value: Number(value) }),
  });
}

async function ctrlMode(deviceId, mode) {
  await fetch(BASE_URL + '/admin/devices/' + encodeURIComponent(deviceId) + '/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ mode }),
  });
  loadDevices();
}

async function delDevice(deviceId) {
  if (!confirm('Удалить устройство ' + deviceId + '?')) return;
  await fetch(BASE_URL + '/admin/devices/' + deviceId, {method:'DELETE', headers:{Authorization:'Bearer ' + token}});
  loadDevices(); loadStats(); loadUnowned();
}

async function delUser(id, email) {
  if (!confirm('Удалить пользователя ' + email + '?\\nЭто удалит все его данные.')) return;
  await fetch(BASE_URL + '/admin/users/' + id, {method:'DELETE', headers:{Authorization:'Bearer ' + token}});
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
    const res = await fetch(BASE_URL + '/admin/notify', {
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
    } else if (res.status === 401) {
      logout();
      return;
    } else {
      resultEl.className = 'notify-result err';
      resultEl.textContent = \`Ошибка \${res.status}: \${data?.message ?? 'Неизвестная ошибка'}\`;
    }
  } catch (e) { resultEl.className = 'notify-result err'; resultEl.textContent = 'Ошибка соединения: ' + e?.message; }

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

// ── ICON PICKER ──────────────────────────────────────────────────────────────
const ICON_OPTIONS = ['☀️','🌤️','⚡','🔋','💡','🏭','🏗️','🌿','🔆','📡','🛰️','⭐','🌞','🔌','🏠','🌱','💎','🔥','❄️','🎯'];
let activePickerDeviceId = null;

// localStorage — мгновенное хранилище (не теряется при обновлении)
const iconCache = JSON.parse(localStorage.getItem('sm_icons') || '{}');

function saveIconCache() {
  localStorage.setItem('sm_icons', JSON.stringify(iconCache));
}

// Иконка: сначала из кэша, потом из DB, по умолчанию ☀️
function getDeviceIcon(device) {
  return iconCache[device.deviceId] || device.icon || '☀️';
}

function openIconPicker(event, deviceId) {
  event.stopPropagation();
  const popup = document.getElementById('iconPickerPopup');
  if (activePickerDeviceId === deviceId && popup.classList.contains('open')) {
    popup.classList.remove('open');
    activePickerDeviceId = null;
    return;
  }
  activePickerDeviceId = deviceId;
  const d = mapDevices.find(x => x.deviceId === deviceId);
  const current = getDeviceIcon(d || { deviceId });
  popup.innerHTML = ICON_OPTIONS.map((ic, idx) =>
    \`<span class="icon-opt \${ic === current ? 'selected' : ''}" onclick="selectIcon(\${idx})">\${ic}</span>\`
  ).join('');

  const rect = event.target.getBoundingClientRect();
  popup.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  popup.style.top = (rect.bottom + 8) + 'px';
  popup.style.position = 'fixed';
  popup.classList.add('open');
}

async function pickIcon(deviceId, icon) {
  console.log('[SunMind] pickIcon', deviceId, icon);
  // 1. Сохраняем в localStorage немедленно — не потеряется при обновлении
  iconCache[deviceId] = icon;
  saveIconCache();
  console.log('[SunMind] iconCache saved', JSON.stringify(iconCache));

  // 2. Обновляем UI
  mapDevices = mapDevices.map(d => d.deviceId === deviceId ? { ...d, icon } : d);
  document.getElementById('iconPickerPopup').classList.remove('open');
  activePickerDeviceId = null;
  const el = document.getElementById('dc-icon-' + deviceId);
  if (el) el.textContent = icon;
  updateMarkerIcon(deviceId);

  // 3. Пробуем сохранить в DB (фоновая синхронизация)
  fetch(BASE_URL + '/admin/devices/' + encodeURIComponent(deviceId) + '/icon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ icon }),
  }).catch(() => {}); // ошибку игнорируем — localStorage уже сохранён
}

function updateMarkerIcon(deviceId) {
  const d = mapDevices.find(x => x.deviceId === deviceId);
  if (!d || !mapMarkers[deviceId]) return;
  mapMarkers[deviceId].setIcon(deviceIcon(d));
}

function selectIcon(idx) {
  if (!activePickerDeviceId) return;
  pickIcon(activePickerDeviceId, ICON_OPTIONS[idx]);
}

document.addEventListener('click', e => {
  const popup = document.getElementById('iconPickerPopup');
  if (popup && !popup.contains(e.target) && !e.target.closest('.dc-icon')) {
    popup.classList.remove('open');
    activePickerDeviceId = null;
  }
});

// ── MAP ─────────────────────────────────────────────────────────────────────
let mapInstance = null;
let mapDevices = [];
let mapMarkers = {};
let placingDeviceId = null;
let mapRefreshInterval = null;

function makeIcon(color, pulse, emoji) {
  const ring = pulse ? \`<div style="position:absolute;inset:0;border-radius:50%;background:\${color};opacity:.3;animation:mpulse 1.5s ease-in-out infinite"></div>\` : '';
  const emojiEl = emoji
    ? \`<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">\${emoji}</div>\`
    : '';
  return L.divIcon({
    className: '',
    html: \`<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center">
      \${emojiEl}
      \${ring}
      <div style="width:12px;height:12px;border-radius:50%;background:\${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>
    </div>
    <style>@keyframes mpulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.9);opacity:0}}</style>\`,
    iconSize: [20, 36], iconAnchor: [10, 36], popupAnchor: [0, -36],
  });
}

function deviceIcon(d) {
  const emoji = getDeviceIcon(d);
  if (!d.online) return makeIcon('#f87171', false, emoji);
  if (d.batteryPercent != null && d.batteryPercent < 20) return makeIcon('#fb923c', true, emoji);
  return makeIcon('#4ade80', true, emoji);
}

const CARD_PALETTES = [
  {bg:'linear-gradient(135deg,#f6c343 0%,#e07a0e 100%)',shadow:'rgba(246,195,67,.4)'},
  {bg:'linear-gradient(135deg,#60a5fa 0%,#2563eb 100%)',shadow:'rgba(96,165,250,.4)'},
  {bg:'linear-gradient(135deg,#4ade80 0%,#16a34a 100%)',shadow:'rgba(74,222,128,.4)'},
  {bg:'linear-gradient(135deg,#f472b6 0%,#be185d 100%)',shadow:'rgba(244,114,182,.4)'},
  {bg:'linear-gradient(135deg,#a78bfa 0%,#7c3aed 100%)',shadow:'rgba(167,139,250,.4)'},
  {bg:'linear-gradient(135deg,#fb923c 0%,#c2410c 100%)',shadow:'rgba(251,146,60,.4)'},
  {bg:'linear-gradient(135deg,#34d399 0%,#065f46 100%)',shadow:'rgba(52,211,153,.4)'},
  {bg:'linear-gradient(135deg,#f87171 0%,#b91c1c 100%)',shadow:'rgba(248,113,113,.4)'},
];

function renderDeviceCards() {
  const wrap = document.getElementById('mapDeviceCards');
  if (!wrap) return;
  wrap.innerHTML = mapDevices.map((d, i) => {
    const isPlacing = placingDeviceId === d.deviceId;
    const hasCoords = d.latitude != null && d.longitude != null;
    const palette = CARD_PALETTES[i % CARD_PALETTES.length];
    const statusText = !d.online ? 'Офлайн' : (d.batteryPercent != null && d.batteryPercent < 20 ? '⚠ Заряд' : 'Онлайн');
    const btnClass = isPlacing ? 'placing' : (hasCoords ? 'placed' : 'idle');
    const btnText = isPlacing ? '✕ Отмена' : (hasCoords ? '📍 Переместить' : '＋ Разместить');
    const coords = hasCoords ? \`\${d.latitude.toFixed(5)}, \${d.longitude.toFixed(5)}\` : '';
    const meta = [
      d.batteryPercent != null ? 'АКБ: ' + d.batteryPercent + '%' : null,
      d.lux != null ? d.lux + ' лк' : null,
      d.brightness != null ? 'Ярк: ' + d.brightness : null,
    ].filter(Boolean).join(' · ') || '—';
    return \`<div class="device-card \${isPlacing ? 'active' : ''}" id="card-\${d.deviceId}"
      style="background:\${palette.bg};box-shadow:0 4px 16px \${palette.shadow}">
      <div class="dc-top">
        <span class="dc-icon" id="dc-icon-\${d.deviceId}" title="Нажмите, чтобы изменить иконку" onclick="openIconPicker(event,'\${d.deviceId}')">\${getDeviceIcon(d)}</span>
        <div class="dc-name">\${d.name || d.deviceId}</div>
        \${d.name ? \`<div class="dc-id">\${d.deviceId}</div>\` : ''}
        <div class="dc-status">\${statusText}</div>
      </div>
      <div class="dc-bottom">
        <div class="dc-meta">\${meta}</div>
        <div class="dc-coords">\${coords}</div>
        <button class="place-btn \${btnClass}" onclick="togglePlacing('\${d.deviceId}')">\${btnText}</button>
      </div>
    </div>\`;
  }).join('');
}

function togglePlacing(deviceId) {
  if (placingDeviceId === deviceId) {
    placingDeviceId = null;
  } else {
    placingDeviceId = deviceId;
  }
  const banner = document.getElementById('mapPlacingBanner');
  const container = document.getElementById('mapContainer');
  if (placingDeviceId) {
    const d = mapDevices.find(x => x.deviceId === placingDeviceId);
    banner.textContent = \`Нажмите на карту, чтобы разместить «\${d?.name || placingDeviceId}»\`;
    banner.classList.add('visible');
    container.classList.add('placing');
  } else {
    banner.classList.remove('visible');
    container.classList.remove('placing');
  }
  renderDeviceCards();
}

async function loadMap() {
  const data = await api('/admin/devices');
  if (!data) return;
  // Мержим иконки: DB icon имеет приоритет и синхронизирует кэш
  data.forEach(d => {
    if (d.icon) { iconCache[d.deviceId] = d.icon; saveIconCache(); }
    else if (iconCache[d.deviceId]) { d.icon = iconCache[d.deviceId]; }
  });
  mapDevices = data;

  const container = document.getElementById('mapContainer');
  if (!container) return;
  if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarkers = {}; }
  container.innerHTML = '';
  placingDeviceId = null;
  document.getElementById('mapPlacingBanner')?.classList.remove('visible');
  container.classList.remove('placing');

  const withCoords = data.filter(d => d.latitude != null && d.longitude != null);
  let centerLat = 42.8746, centerLng = 74.5698;
  if (withCoords.length > 0) {
    centerLat = withCoords.reduce((s, d) => s + d.latitude, 0) / withCoords.length;
    centerLng = withCoords.reduce((s, d) => s + d.longitude, 0) / withCoords.length;
  }

  mapInstance = L.map(container).setView([centerLat, centerLng], withCoords.length > 0 ? 12 : 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19,
  }).addTo(mapInstance);

  withCoords.forEach(d => {
    const bat = d.batteryPercent != null ? d.batteryPercent + '%' : '—';
    const status = d.online
      ? '<span style="color:#4ade80;font-weight:700">● Онлайн</span>'
      : '<span style="color:#f87171;font-weight:700">● Офлайн</span>';
    const popup = \`<div style="font-family:-apple-system,sans-serif;min-width:180px">
      <div style="font-size:14px;font-weight:700;margin-bottom:5px">\${d.name || d.deviceId}</div>
      <div style="font-size:12px;color:#555;margin-bottom:3px">ID: \${d.deviceId}</div>
      <div style="font-size:12px;margin-bottom:2px">\${status}</div>
      <div style="font-size:12px;color:#555">АКБ: \${bat}</div>
      <div style="font-size:11px;color:#999;margin-top:4px">\${d.latitude.toFixed(5)}, \${d.longitude.toFixed(5)}</div>
    </div>\`;
    mapMarkers[d.deviceId] = L.marker([d.latitude, d.longitude], { icon: deviceIcon(d) })
      .addTo(mapInstance).bindPopup(popup);
  });

  // Клик по карте — ставим маркер выбранного устройства
  mapInstance.on('click', async e => {
    if (!placingDeviceId) return;
    const { lat, lng } = e.latlng;
    const deviceId = placingDeviceId;

    // Сохраняем на сервер
    await fetch(BASE_URL + '/admin/devices/' + encodeURIComponent(deviceId) + '/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });

    // Обновляем локальные данные
    mapDevices = mapDevices.map(d => d.deviceId === deviceId ? { ...d, latitude: lat, longitude: lng } : d);
    const d = mapDevices.find(x => x.deviceId === deviceId);

    // Обновляем / добавляем маркер
    if (mapMarkers[deviceId]) {
      mapMarkers[deviceId].setLatLng([lat, lng]);
    } else {
      const bat = d.batteryPercent != null ? d.batteryPercent + '%' : '—';
      const status = d.online
        ? '<span style="color:#4ade80;font-weight:700">● Онлайн</span>'
        : '<span style="color:#f87171;font-weight:700">● Офлайн</span>';
      const popup = \`<div style="font-family:-apple-system,sans-serif;min-width:180px">
        <div style="font-size:14px;font-weight:700;margin-bottom:5px">\${d.name || d.deviceId}</div>
        <div style="font-size:12px;margin-bottom:2px">\${status}</div>
        <div style="font-size:12px;color:#555">АКБ: \${bat}</div>
      </div>\`;
      mapMarkers[deviceId] = L.marker([lat, lng], { icon: deviceIcon(d) })
        .addTo(mapInstance).bindPopup(popup);
    }

    placingDeviceId = null;
    document.getElementById('mapPlacingBanner')?.classList.remove('visible');
    document.getElementById('mapContainer')?.classList.remove('placing');
    renderDeviceCards();
  });

  renderDeviceCards();
}

function startMapPolling() {
  stopMapPolling();
  mapRefreshInterval = setInterval(softRefreshMap, 30000);
}

function stopMapPolling() {
  if (mapRefreshInterval) { clearInterval(mapRefreshInterval); mapRefreshInterval = null; }
}

async function softRefreshMap() {
  const data = await api('/admin/devices');
  if (!data || !mapInstance) return;
  data.forEach(d => {
    if (d.icon) { iconCache[d.deviceId] = d.icon; saveIconCache(); }
    else if (iconCache[d.deviceId]) { d.icon = iconCache[d.deviceId]; }
  });
  mapDevices = data;
  data.forEach(d => {
    if (d.latitude == null || d.longitude == null) return;
    if (mapMarkers[d.deviceId]) {
      mapMarkers[d.deviceId].setLatLng([d.latitude, d.longitude]);
      mapMarkers[d.deviceId].setIcon(deviceIcon(d));
    } else {
      const bat = d.batteryPercent != null ? d.batteryPercent + '%' : '—';
      const status = d.online
        ? '<span style="color:#4ade80;font-weight:700">● Онлайн</span>'
        : '<span style="color:#f87171;font-weight:700">● Офлайн</span>';
      const popup = \`<div style="font-family:-apple-system,sans-serif;min-width:180px">
        <div style="font-size:14px;font-weight:700;margin-bottom:5px">\${d.name || d.deviceId}</div>
        <div style="font-size:12px;color:#555;margin-bottom:3px">ID: \${d.deviceId}</div>
        <div style="font-size:12px;margin-bottom:2px">\${status}</div>
        <div style="font-size:12px;color:#555">АКБ: \${bat}</div>
        <div style="font-size:11px;color:#999;margin-top:4px">\${d.latitude.toFixed(5)}, \${d.longitude.toFixed(5)}</div>
      </div>\`;
      mapMarkers[d.deviceId] = L.marker([d.latitude, d.longitude], { icon: deviceIcon(d) })
        .addTo(mapInstance).bindPopup(popup);
    }
  });
  renderDeviceCards();
  const lbl = document.getElementById('mapLastUpdated');
  if (lbl) lbl.textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru');
}

// ── Location modal ───────────────────────────────────────────────────────────
let locDeviceId = null;
let locMapInst = null;
let locMarker = null;

const locPinIcon = () => L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;background:#f6c343;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(246,195,67,.9)"></div>',
  iconSize: [22, 22], iconAnchor: [11, 11],
});

function openLocModal(deviceId, name, lat, lng) {
  locDeviceId = deviceId;
  document.getElementById('locModalTitle').textContent = 'Координаты: ' + (name || deviceId);
  document.getElementById('locLat').value = (lat != null && !isNaN(lat)) ? lat : '';
  document.getElementById('locLng').value = (lng != null && !isNaN(lng)) ? lng : '';
  document.getElementById('locModal').classList.add('open');

  setTimeout(() => {
    const container = document.getElementById('locMapContainer');
    if (locMapInst) { locMapInst.remove(); locMapInst = null; locMarker = null; }
    container.innerHTML = '';

    const hasCoords = lat != null && !isNaN(lat) && lng != null && !isNaN(lng);
    const cLat = hasCoords ? lat : 42.8746;
    const cLng = hasCoords ? lng : 74.5698;
    locMapInst = L.map(container).setView([cLat, cLng], hasCoords ? 13 : 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(locMapInst);

    if (hasCoords) {
      locMarker = L.marker([lat, lng], { icon: locPinIcon() }).addTo(locMapInst);
    }

    locMapInst.on('click', e => {
      const { lat: la, lng: ln } = e.latlng;
      document.getElementById('locLat').value = la.toFixed(6);
      document.getElementById('locLng').value = ln.toFixed(6);
      if (locMarker) { locMarker.setLatLng([la, ln]); }
      else { locMarker = L.marker([la, ln], { icon: locPinIcon() }).addTo(locMapInst); }
    });
  }, 60);
}

function locMoveMarker() {
  if (!locMapInst) return;
  const lat = parseFloat(document.getElementById('locLat').value);
  const lng = parseFloat(document.getElementById('locLng').value);
  if (isNaN(lat) || isNaN(lng)) return;
  if (locMarker) { locMarker.setLatLng([lat, lng]); }
  else { locMarker = L.marker([lat, lng], { icon: locPinIcon() }).addTo(locMapInst); }
  locMapInst.setView([lat, lng]);
}

function closeLocModal() {
  document.getElementById('locModal').classList.remove('open');
  if (locMapInst) { locMapInst.remove(); locMapInst = null; locMarker = null; }
  locDeviceId = null;
}

async function saveLocation() {
  const lat = parseFloat(document.getElementById('locLat').value);
  const lng = parseFloat(document.getElementById('locLng').value);
  if (!locDeviceId || isNaN(lat) || isNaN(lng)) { alert('Введите корректные координаты'); return; }
  await fetch(BASE_URL + '/admin/devices/' + encodeURIComponent(locDeviceId) + '/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
  closeLocModal();
  loadDevices();
}
</script>
</body>
</html>`;
  }
}
