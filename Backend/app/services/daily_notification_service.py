import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from app.core.config import settings
from app.services.loyalty_service import loyalty_service
from app.services.google_wallet_service import google_wallet_service

# Zona horaria oficial de la Ciudad de México (UTC-6)
CDMX_TZ = timezone(timedelta(hours=-6), name="America/Mexico_City")

DIAS_SEMANA_MAP = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo"
}


class DailyNotificationService:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running: bool = False
        self.last_run_info: Optional[Dict[str, Any]] = None

    def get_cdmx_now(self) -> datetime:
        return datetime.now(CDMX_TZ)

    def get_today_promo(self) -> Dict[str, Any]:
        """Obtiene la regla de promoción correspondiente al día de hoy en hora CDMX."""
        now = self.get_cdmx_now()
        iso_day = now.isoweekday()  # 1=Lunes, 7=Domingo
        dia_nombre = DIAS_SEMANA_MAP.get(iso_day, "Hoy")

        rules = loyalty_service.get_points_rules()
        today_rule = next((r for r in rules if r.get("dia_semana") == iso_day and r.get("is_active", True)), None)

        if not today_rule:
            today_rule = next((r for r in rules if r.get("dia_semana") == iso_day), None)
        if not today_rule:
            today_rule = next((r for r in rules if r.get("dia_semana") is None and r.get("is_active", True)), None)

        if today_rule:
            desc = today_rule.get("descripcion")
            monto = today_rule.get("monto_dinero", 0)
            puntos = today_rule.get("puntos_otorgados", 0)

            header = f"☕ ¡Promoción de {dia_nombre}!"
            body = desc if desc else f"¡Hoy en Cafetería! Por cada ${monto:.2f} de consumo recibe {puntos} puntos en tu tarjeta."
            return {
                "dia_semana": iso_day,
                "dia_nombre": dia_nombre,
                "header": header,
                "body": body,
                "rule": today_rule
            }
        else:
            return {
                "dia_semana": iso_day,
                "dia_nombre": dia_nombre,
                "header": f"☕ ¡Visítanos este {dia_nombre}!",
                "body": "Disfruta de tu café favorito y acumula puntos y sellos en tu tarjeta de lealtad.",
                "rule": None
            }

    def send_daily_promo(self, is_manual: bool = False) -> Dict[str, Any]:
        """Emite la notificación push a todas las tarjetas de Google Wallet activas."""
        promo = self.get_today_promo()
        header = promo["header"]
        body = promo["body"]

        now_str = self.get_cdmx_now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[DailyNotificationService] Transmitiendo promoción {'manual' if is_manual else 'automática (11:30 AM)'} para {promo['dia_nombre']}: '{header}' - '{body}'")

        res = google_wallet_service.broadcast_push_notification(header=header, body=body)

        self.last_run_info = {
            "timestamp": now_str,
            "dia_nombre": promo["dia_nombre"],
            "header": header,
            "body": body,
            "is_manual": is_manual,
            "result": res
        }
        return {
            "status": "success",
            "message": f"Promoción de {promo['dia_nombre']} enviada exitosamente a todas las Google Wallets",
            "notification": self.last_run_info
        }

    def get_status(self) -> Dict[str, Any]:
        """Devuelve el estado del programador automático, hora en CDMX y próxima ejecución."""
        now_cdmx = self.get_cdmx_now()
        target = now_cdmx.replace(
            hour=settings.DAILY_PROMO_HOUR,
            minute=settings.DAILY_PROMO_MINUTE,
            second=0,
            microsecond=0
        )
        if now_cdmx >= target:
            target += timedelta(days=1)

        seconds_until_next = (target - now_cdmx).total_seconds()
        today_promo = self.get_today_promo()

        return {
            "is_running": self._running,
            "enabled_in_settings": settings.DAILY_PROMO_ENABLED,
            "current_time_cdmx": now_cdmx.strftime("%Y-%m-%d %H:%M:%S"),
            "scheduled_time_cdmx": f"{settings.DAILY_PROMO_HOUR:02d}:{settings.DAILY_PROMO_MINUTE:02d} AM",
            "next_run_cdmx": target.strftime("%Y-%m-%d %H:%M:%S"),
            "seconds_until_next_run": round(seconds_until_next, 1),
            "hours_until_next_run": round(seconds_until_next / 3600, 2),
            "today_promo": today_promo,
            "last_run": self.last_run_info
        }

    async def _scheduler_loop(self):
        """Bucle en segundo plano que se ejecuta cada día a las 11:30 AM hora de México Centro."""
        print(f"[DailyNotificationService] Programador automático iniciado para las {settings.DAILY_PROMO_HOUR:02d}:{settings.DAILY_PROMO_MINUTE:02d} AM CDMX.")
        self._running = True

        try:
            while self._running:
                now_cdmx = self.get_cdmx_now()
                target = now_cdmx.replace(
                    hour=settings.DAILY_PROMO_HOUR,
                    minute=settings.DAILY_PROMO_MINUTE,
                    second=0,
                    microsecond=0
                )
                if now_cdmx >= target:
                    target += timedelta(days=1)

                seconds_to_wait = (target - now_cdmx).total_seconds()
                print(f"[DailyNotificationService] Próximo envío programado en {seconds_to_wait / 3600:.2f} horas ({target.strftime('%Y-%m-%d %H:%M:%S')} CDMX).")

                # Dormir en intervalos de hasta 60s para permitir apagado limpio si se detiene el servidor
                while seconds_to_wait > 0 and self._running:
                    step = min(seconds_to_wait, 60.0)
                    await asyncio.sleep(step)
                    now_cdmx = self.get_cdmx_now()
                    seconds_to_wait = (target - now_cdmx).total_seconds()

                if not self._running:
                    break

                if settings.DAILY_PROMO_ENABLED:
                    try:
                        self.send_daily_promo(is_manual=False)
                    except Exception as e:
                        print(f"[DailyNotificationService] Error enviando promoción programada: {e}")

                # Espera de 2 segundos para evitar disparos repetidos en el mismo segundo
                await asyncio.sleep(2)
        except asyncio.CancelledError:
            print("[DailyNotificationService] Tarea programada cancelada.")
        finally:
            self._running = False

    def start_scheduler(self):
        """Inicia la tarea en segundo plano si no está activa."""
        if not self._running or self._task is None or self._task.done():
            self._task = asyncio.create_task(self._scheduler_loop())

    def stop_scheduler(self):
        """Detiene la tarea en segundo plano."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()


daily_notification_service = DailyNotificationService()
