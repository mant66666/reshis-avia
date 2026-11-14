import { useEffect, useRef, useState } from 'react';
import { Chart, Filler, LineElement, LinearScale, PointElement, ScatterController } from 'chart.js';
import type { ChartDataset, Plugin } from 'chart.js';
import type { Forecast } from '../api/forecast';
import { formatNumber } from '../utils/format';
import './DemandChart.css';

Chart.register(ScatterController, LinearScale, PointElement, LineElement, Filler);

const demandColor = '#1759d1';
const capacityColor = '#835b12';

export default function DemandChart({ forecast }: { forecast: Forecast }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(4);
  const { quantiles, demand, seats } = forecast;
  const selected = quantiles[selectedIndex];

  useEffect(() => {
    if (!canvas.current) return;

    const points = quantiles.map(({ quantile, demand }) => ({
      x: Math.round(quantile * 100),
      y: demand,
    }));
    const plotMaximum = Math.max(100, seats * 1.2, ...points.map(({ y }) => y * 1.18));

    const demandLine: ChartDataset<'scatter'> = {
      label: 'Расчётный спрос',
      data: points,
      showLine: true,
      fill: 'origin',
      backgroundColor: '#1759d112',
      borderColor: demandColor,
      borderWidth: 2,
      pointBackgroundColor: points.map(({ x }) => x === 50 ? demandColor : '#fff'),
      pointBorderColor: demandColor,
      pointBorderWidth: 2,
      pointRadius: points.map(({ x }) => x === 50 ? 6 : 3),
      pointHoverBackgroundColor: demandColor,
      pointHoverRadius: 6,
      pointHitRadius: 12,
    };

    const capacityLine: ChartDataset<'scatter'> = {
      label: 'Вместимость',
      data: [{ x: 9, y: seats }, { x: 91, y: seats }],
      showLine: true,
      borderColor: capacityColor,
      borderDash: [6, 5],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 0,
    };

    const capacityZone: Plugin<'scatter'> = {
      id: 'capacityZone',
      beforeDatasetsDraw({ ctx, chartArea, scales }) {
        const { top, left, width } = chartArea;
        ctx.save();
        ctx.fillStyle = '#fdf9f0';
        ctx.fillRect(left, top, width, scales.y.getPixelForValue(seats) - top);
        ctx.restore();
      },
    };

    const chart = new Chart(canvas.current, {
      type: 'scatter',
      data: { datasets: [demandLine, capacityLine] },
      plugins: [capacityZone],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        locale: 'ru-RU',
        interaction: { mode: 'nearest', intersect: true },
        onHover(event, elements) {
          const point = elements.find(({ datasetIndex }) => datasetIndex === 0);
          if (event.native?.target instanceof HTMLCanvasElement) {
            event.native.target.style.cursor = point ? 'pointer' : '';
          }
          if (point) setSelectedIndex(point.index);
        },
        onClick(_event, elements) {
          const point = elements.find(({ datasetIndex }) => datasetIndex === 0);
          if (point) setSelectedIndex(point.index);
        },
        scales: {
          x: {
            min: 9,
            max: 91,
            afterBuildTicks(axis) {
              const labels = axis.width < 225 ? points.filter((_, index) => index % 2 === 0) : points;
              axis.ticks = labels.map(({ x }) => ({ value: x }));
            },
            ticks: { autoSkip: false, maxRotation: 0, callback: (value) => `${value}%` },
            grid: { display: false },
          },
          y: {
            suggestedMin: 0,
            max: Math.ceil(plotMaximum / 100) * 100,
            ticks: { count: 5 },
            grid: { color: '#e5eaf2' },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [quantiles, seats]);

  return (
    <section className="demand-panel" aria-labelledby="demand-heading">
      <h2 id="demand-heading">Распределение спроса</h2>
      <p className="demand-price">При цене {formatNumber(forecast.price)} ₽ за билет</p>
      <div className="demand-plot-heading">
        <span>Расчётный спрос, билеты</span>
        <span className="capacity-label"><i aria-hidden="true" />Вместимость · {formatNumber(seats)} мест</span>
      </div>
      <div className="demand-plot">
        <canvas ref={canvas} role="img" aria-label="Девять квантилей спроса и линия вместимости" aria-describedby="demand-caption" />
      </div>
      <p className="demand-caption" id="demand-caption">Вероятность (процентиль)</p>
      <ul className="demand-legend" aria-label="Обозначения графика">
        <li><span className="legend-quantile" aria-hidden="true" />Расчётный спрос</li>
        <li className="median-legend"><span className="legend-median" aria-hidden="true" />50% · Медиана · {formatNumber(demand)}</li>
      </ul>
      <p className="point-hint" aria-live="polite">
        {selected.demand < 0
          ? `В точке ${Math.round(selected.quantile * 100)}% модель даёт отрицательный расчётный спрос (${formatNumber(selected.demand)}).`
          : `С вероятностью ${Math.round(selected.quantile * 100)}% спрос составит не более ${formatNumber(selected.demand)} билетов.`}
      </p>
      <details className="demand-values">
        <summary>Все значения</summary>
        <table>
          <thead>
            <tr><th scope="col">Вероятность</th><th scope="col">Расчётный спрос, билеты</th></tr>
          </thead>
          <tbody>
            {quantiles.map(({ quantile, demand: value }, index) => (
              <tr key={quantile} className={quantile === 0.5 ? 'median-row' : undefined}>
                <th scope="row">
                  <button className="quantile-choice" type="button" aria-pressed={index === selectedIndex} onClick={() => setSelectedIndex(index)}>
                    {Math.round(quantile * 100)}%
                  </button>
                </th>
                <td>{formatNumber(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
