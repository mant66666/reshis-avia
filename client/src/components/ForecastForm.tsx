import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getForecast, getRoutes } from '../api/forecast';
import type { Forecast, Route } from '../api/forecast';
import { formatShortDate, formatNumber } from '../utils/format';

type Props = {
  calculating: boolean;
  onCalculatingChange: (value: boolean) => void;
  onForecastChange: (forecast: Forecast | null) => void;
  onPriceChange: (price: number) => void;
};

type FlightSelection = {
  routeCode: string;
  date: string;
  price: string;
};

const pricePattern = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i;

function groupPrice(price: string) {
  return price.replace(/^\d+(?=[.,]|$)/, (digits) =>
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
  );
}

function selectFlight(route: Route, previousDate = ''): FlightSelection {
  const date = route.dates.includes(previousDate) ? previousDate : route.dates[0];
  return { routeCode: route.code, date, price: String(route.basePrice) };
}

export default function ForecastForm({ calculating, onCalculatingChange, onForecastChange, onPriceChange }: Props) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selection, setSelection] = useState<FlightSelection | null>(null);
  const [routesError, setRoutesError] = useState('');
  const [forecastError, setForecastError] = useState('');
  const [routeAttempt, setRouteAttempt] = useState(0);
  const [editingPrice, setEditingPrice] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoutes() {
      try {
        const options = await getRoutes(controller.signal);
        if (controller.signal.aborted) return;

        const firstRoute = options[0];
        if (!firstRoute) {
          setRoutesError('В прогнозе пока нет доступных рейсов.');
          return;
        }

        setRoutes(options);
        setSelection(selectFlight(firstRoute));
      } catch (error) {
        if (controller.signal.aborted) return;
        setRoutesError(error instanceof Error ? error.message : 'Не удалось загрузить маршруты.');
      }
    }

    loadRoutes();
    return () => controller.abort();
  }, [routeAttempt]);

  const route = routes.find((item) => item.code === selection?.routeCode);
  const origins = [...new Set(routes.map((item) => item.origin))];
  const destinations = routes.filter((item) => item.origin === route?.origin);

  function clearForecast() {
    onForecastChange(null);
    setForecastError('');
  }

  function changeRoute(next: Route) {
    setSelection(selectFlight(next, selection?.date));
    clearForecast();
  }

  function changeDeparture(origin: string) {
    const next = routes.find((item) => item.origin === origin);
    if (next) changeRoute(next);
  }

  function changeDestination(code: string) {
    const next = routes.find((item) => item.code === code);
    if (next) changeRoute(next);
  }

  function changeField(field: 'date' | 'price', value: string) {
    if (!selection) return;
    setSelection({ ...selection, [field]: value });
    if (field === 'price') {
      onPriceChange(pricePattern.test(value) ? Number(value.replace(',', '.')) : NaN);
      setForecastError('');
    } else {
      clearForecast();
    }
  }

  function retryRoutes() {
    setRoutesError('');
    setRouteAttempt((attempt) => attempt + 1);
  }

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || calculating) return;

    const price = Number(selection.price.replace(',', '.'));
    if (!pricePattern.test(selection.price) || !Number.isFinite(price)) {
      setForecastError('Укажите цену от 0 ₽');
      return;
    }

    setForecastError('');
    onCalculatingChange(true);

    try {
      const forecast = await getForecast(selection.routeCode, selection.date, price);
      onForecastChange(forecast);
    } catch (error) {
      setForecastError(error instanceof Error ? error.message : 'Не удалось рассчитать прогноз.');
    } finally {
      onCalculatingChange(false);
    }
  }

  return (
    <section className="form-panel" aria-labelledby="form-heading">
      <h2 id="form-heading">Параметры прогноза</h2>
      {routesError && (
        <div className="load-state">
          <p className="error" role="alert">{routesError}</p>
          <button type="button" onClick={retryRoutes}>Повторить загрузку</button>
        </div>
      )}
      {!routesError && !route && (
        <p className="load-state" role="status">Загружаем рейсы…</p>
      )}
      {route && selection && (
        <form onSubmit={calculate}>
          <fieldset disabled={calculating}>
            <div className="fields">
              <div className={origins.length === 1 ? 'single-origin' : 'origin-field'}>
                <label htmlFor="departure">Откуда</label>
                {origins.length === 1 ? (
                  <input id="departure" value={route.origin} readOnly />
                ) : (
                  <select id="departure" value={route.origin} onChange={(event) => changeDeparture(event.target.value)}>
                    {origins.map((origin) => <option key={origin}>{origin}</option>)}
                  </select>
                )}
              </div>
              <div className="destination-field">
                <label htmlFor="destination">Куда</label>
                <select id="destination" value={route.code} onChange={(event) => changeDestination(event.target.value)}>
                  {destinations.map((item) => <option key={item.code} value={item.code}>{item.destination}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="flight-date">Дата вылета</label>
                <select id="flight-date" value={selection.date} onChange={(event) => changeField('date', event.target.value)}>
                  {route.dates.map((day) => <option key={day} value={day}>{formatShortDate(day)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ticket-price">Цена билета</label>
                <div className="price-field">
                  <input id="ticket-price" inputMode="decimal" required
                    value={editingPrice ? selection.price : groupPrice(selection.price)}
                    aria-describedby="base-price"
                    onFocus={() => setEditingPrice(true)}
                    onBlur={() => setEditingPrice(false)}
                    onChange={(event) => changeField('price', event.target.value.replace(/\s/g, ''))} />
                  <span aria-hidden="true">₽</span>
                </div>
              </div>
            </div>
            <p className="base-price" id="base-price">Базовая цена маршрута — {formatNumber(route.basePrice)} ₽</p>
            {forecastError && <p className="error" role="alert">{forecastError}</p>}
            <button className="calculate" type="submit" aria-busy={calculating}>
              {calculating && <span className="calculate-spinner" aria-hidden="true" />}
              {calculating ? 'Рассчитываем…' : 'Рассчитать прогноз'}
              {!calculating && <span aria-hidden="true">→</span>}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
