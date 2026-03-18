import { supabase } from './supabase-config.js';
import { generateUID, formatCurrency, getDateRange } from './utils.js';

const widgetTypes = {
    kpi: 'KPI Card',
    bar: 'Bar Chart',
    line: 'Line Chart',
    area: 'Area Chart',
    scatter: 'Scatter Chart',
    pie: 'Pie Chart',
    table: 'Table Widget'
};

export async function createKPIWidget(config) {
    const { metric = 'sum', field = 'total_amount', label = 'Total Revenue' } = config;
    try {
        let query = supabase.from('customer_orders').select(field);

        const { data, error } = await query;
        if (error) throw error;
        const total = data.reduce((sum, item) => sum + item.total_amount, 0);

        let value = 0;
        if (data && data.length > 0) {
            const values = data.map(d => parseFloat(d[field]) || 0);

            switch (metric) {
                case 'sum':
                    value = values.reduce((a, b) => a + b, 0);
                    break;
                case 'avg':
                    value = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case 'count':
                    value = values.length;
                    break;
                case 'max':
                    value = Math.max(...values);
                    break;
                case 'min':
                    value = Math.min(...values);
                    break;
            }
        }

        return {
            type: 'kpi',
            html: `
                <div class="kpi-card">
                    <div class="kpi-label">${label}</div>
                    <div class="kpi-value">${metric === 'count' ? value : formatCurrency(value)}</div>
                    <div class="kpi-change">Updated just now</div>
                </div>
            `
        };
    } catch (error) {
        console.error('Error creating KPI widget:', error);
        return {
            type: 'kpi',
            html: '<div class="kpi-card"><div class="kpi-label">Error loading data</div></div>'
        };
    }
}

export async function createChartWidget(type, config) {
    const { xAxis = 'customer_name', yAxis = 'total_amount', label = 'Chart Data' } = config;

    try {
        const { data, error } = await supabase
            .from('customer_orders')
            .select(`${xAxis}, ${yAxis}`);

        if (error) throw error;

        const chartData = prepareChartData(data, xAxis, yAxis, type);

        return {
            type: 'chart',
            chartType: type,
            data: chartData,
            html: `<canvas id="chart-${generateUID()}"></canvas>`,
            config: chartData
        };
    } catch (error) {
        console.error('Error creating chart widget:', error);
        return {
            type: 'chart',
            html: '<div style="text-align: center; color: var(--text-muted);">Error loading chart data</div>'
        };
    }
}

export async function createTableWidget(config) {
    const { limit = 5 } = config;

    try {
        const { data, error } = await supabase
            .from('customer_orders')
            .select('*')
            .limit(limit)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const html = `
            <table class="orders-table" style="width: 100%; font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${(data || []).map(row => `
                        <tr>
                            <td>${row.customer_name || 'N/A'}</td>
                            <td>${row.product_name || 'N/A'}</td>
                            <td>${formatCurrency(row.total_amount || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        return {
            type: 'table',
            html
        };
    } catch (error) {
        console.error('Error creating table widget:', error);
        return {
            type: 'table',
            html: '<div style="text-align: center; color: var(--text-muted);">Error loading table data</div>'
        };
    }
}

function prepareChartData(rawData, xAxis, yAxis, type) {
    if (!rawData || rawData.length === 0) {
        return {
            labels: [],
            datasets: [{
                label: yAxis,
                data: []
            }]
        };
    }

    const grouped = {};

    rawData.forEach(row => {
        const key = row[xAxis] || 'Unknown';
        if (!grouped[key]) {
            grouped[key] = 0;
        }
        grouped[key] += parseFloat(row[yAxis]) || 0;
    });

    return {
        labels: Object.keys(grouped).slice(0, 10),
        datasets: [{
            label: yAxis,
            data: Object.values(grouped).slice(0, 10),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: type === 'area'
        }]
    };
}

export function renderChart(canvas, type, chartData) {
    const ctx = canvas.getContext('2d');

    // Neobrutalist color palette for chart datasets
    const nb = {
        border: '#0A0A0A',
        grid:   'rgba(10,10,10,0.08)',
        label:  '#0A0A0A',
        tick:   '#444444',
        datasets: ['#FF3E6C','#FFE500','#00C9F0','#7C3AED','#00D67F','#FF7A00']
    };

    // Apply neobrutalist dataset colors
    if (chartData.datasets) {
        chartData.datasets.forEach((ds, i) => {
            const color = nb.datasets[i % nb.datasets.length];
            ds.borderColor = color;
            ds.backgroundColor = type === 'doughnut' || type === 'pie'
                ? nb.datasets  // pie gets all colors
                : color + '33'; // 20% opacity fill
            ds.borderWidth = 2;
            ds.pointBackgroundColor = color;
            ds.pointBorderColor = '#0A0A0A';
            ds.pointBorderWidth = 2;
            ds.pointRadius = 4;
        });
    }

    const chartConfig = {
        type: type,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: nb.label,
                        font: { weight: '700', family: 'Space Grotesk' },
                        boxWidth: 14,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: '#0A0A0A',
                    titleColor: '#FFE500',
                    bodyColor: '#FFFFFF',
                    borderColor: '#0A0A0A',
                    borderWidth: 2,
                    padding: 10,
                    titleFont: { weight: '800', family: 'Space Grotesk' },
                    bodyFont:  { family: 'Space Grotesk' }
                }
            },
            scales: type === 'doughnut' || type === 'pie' ? {} : {
                y: {
                    ticks: { color: nb.tick, font: { weight: '600', family: 'Space Grotesk' } },
                    grid:  { color: nb.grid },
                    border: { color: nb.border, width: 2 }
                },
                x: {
                    ticks: { color: nb.tick, font: { weight: '600', family: 'Space Grotesk' }, maxRotation: 30 },
                    grid:  { color: nb.grid },
                    border: { color: nb.border, width: 2 }
                }
            }
        }
    };

    return new Chart(ctx, chartConfig);
}

export const widgetTypesMap = widgetTypes;
