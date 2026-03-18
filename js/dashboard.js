import { supabase } from './supabase-config.js';
import { showNotification, getDateRange, generateUID, deepClone } from './utils.js';
import { createKPIWidget, createChartWidget, createTableWidget, renderChart, widgetTypesMap } from './widgets.js';

let gridStack = null;
let widgets = {};
let currentFilter = 'all';
let dashboardConfig = {};
let dashboardData = [];
let isDashboardInitialized = false;

export function resetDashboard() {
    isDashboardInitialized = false;
    gridStack = null;
    widgets = {};
}

export async function initializeDashboard() {
    // Prevent re-initialization on repeated nav clicks
    if (isDashboardInitialized) return;
    isDashboardInitialized = true;
    const dashboardSection = document.getElementById('dashboard-section');
    dashboardSection.innerHTML = `
        <div class="dashboard-header">
            <h2>📊 Dashboard</h2>
            <div class="dashboard-controls">
                <button class="btn-config" onclick="window.configureDashboard()">⚙️ Configure Dashboard</button>
            </div>
        </div>
        
        <div class="filter-panel">
            <div class="filter-group">
                <label>Date Filter:</label>
                <select id="date-filter" onchange="window.applyDateFilter(this.value)">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                </select>
            </div>
            <button class="filter-btn" onclick="window.applyDateFilter(document.getElementById('date-filter').value)">Apply Filter</button>
        </div>
        
        <div class="grid-container">
            <div id="empty-state-container"></div>
            <div class="grid-stack"></div>
        </div>
        
        <div id="settings-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Configure Dashboard</h3>
                    <button class="modal-close" onclick="window.closeSettings()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="settings-group">
                        <label>Widget Type</label>
                        <select id="widget-type-select" onchange="window.updateWidgetOptions()">
                            ${Object.entries(widgetTypesMap).map(([key, value]) =>
        `<option value="${key}">${value}</option>`
    ).join('')}
                        </select>
                    </div>
                    
                    <div id="widget-options-container"></div>
                    
                    <button class="btn-save-settings" onclick="window.addWidget()">Add Widget</button>
                </div>
            </div>
        </div>
        
        <div id="widget-settings-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Widget Settings</h3>
                    <button class="modal-close" onclick="window.closeWidgetSettings()">×</button>
                </div>
                
                <div class="modal-body" id="widget-settings-content">
                </div>
            </div>
        </div>
    `;

    window.configureDashboard = configureDashboard;
    window.closeSettings = closeSettings;
    window.updateWidgetOptions = updateWidgetOptions;
    window.addWidget = addWidget;
    window.closeWidgetSettings = closeWidgetSettings;
    window.applyDateFilter = applyDateFilter;
    window.openWidgetSettings = openWidgetSettings;
    window.removeWidget = removeWidget;

    initializeGridStack();
    await loadSavedLayout();
}

function initializeGridStack() {
    const gridElement = document.querySelector('.grid-stack');

    gridStack = GridStack.init({
        column: 12,
        cellHeight: 60,
        minRow: 2,
        margin: 8,
        animate: true,
        float: false,
        resizable: { handles: 'se' },
        draggable: { handle: '.widget-header' }
    }, gridElement);

    // Responsive columns
    gridStack.on('resizestop', saveLayoutToLocalStorage);
    gridStack.on('dragstop', saveLayoutToLocalStorage);

    // Handle window resize
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        if (width <= 768) {
            gridStack.column(4);
        } else if (width <= 1024) {
            gridStack.column(8);
        } else {
            gridStack.column(12);
        }
    });
}

function configureDashboard() {
    document.getElementById('settings-modal').classList.add('show');
    updateWidgetOptions();
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('show');
}

function updateWidgetOptions() {
    const widgetType = document.getElementById('widget-type-select').value;
    const container = document.getElementById('widget-options-container');

    let html = '';

    switch (widgetType) {
        case 'kpi':
            html = `
                <div class="settings-group">
                    <label>Metric Type</label>
                    <select id="metric-type">
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                        <option value="count">Count</option>
                        <option value="max">Maximum</option>
                        <option value="min">Minimum</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Field</label>
                    <select id="kpi-field">
                        <option value="total_amount">Total Amount</option>
                        <option value="quantity">Quantity</option>
                        <option value="unit_price">Unit Price</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Label</label>
                    <input type="text" id="kpi-label" placeholder="e.g., Total Revenue" value="Total Revenue">
                </div>
            `;
            break;

        case 'bar':
        case 'line':
        case 'area':
        case 'scatter':
            html = `
                <div class="settings-group">
                    <label>X-Axis Field</label>
                    <select id="chart-x-axis">
                        <option value="customer_name">Customer Name</option>
                        <option value="product_name">Product Name</option>
                        <option value="order_date">Order Date</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Y-Axis Field</label>
                    <select id="chart-y-axis">
                        <option value="total_amount">Total Amount</option>
                        <option value="quantity">Quantity</option>
                        <option value="unit_price">Unit Price</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Chart Label</label>
                    <input type="text" id="chart-label" placeholder="Chart Title" value="${widgetTypesMap[widgetType]}">
                </div>
            `;
            break;

        case 'pie':
            html = `
                <div class="settings-group">
                    <label>Category Field</label>
                    <select id="pie-category">
                        <option value="customer_name">Customer Name</option>
                        <option value="product_name">Product Name</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Value Field</label>
                    <select id="pie-value">
                        <option value="total_amount">Total Amount</option>
                        <option value="quantity">Quantity</option>
                    </select>
                </div>
            `;
            break;

        case 'table':
            html = `
                <div class="settings-group">
                    <label>Records to Display</label>
                    <input type="number" id="table-limit" min="1" max="20" value="5">
                </div>
            `;
            break;
    }

    container.innerHTML = html;
}

async function addWidget() {
    const widgetType = document.getElementById('widget-type-select').value;
    const widgetId = generateUID();

    let config = {};
    let widget = {};

    try {
        switch (widgetType) {
            case 'kpi':
                config = {
                    metric: document.getElementById('metric-type').value,
                    field: document.getElementById('kpi-field').value,
                    label: document.getElementById('kpi-label').value
                };
                widget = await createKPIWidget(config);
                break;

            case 'bar':
            case 'line':
            case 'area':
            case 'scatter':
                config = {
                    xAxis: document.getElementById('chart-x-axis').value,
                    yAxis: document.getElementById('chart-y-axis').value,
                    label: document.getElementById('chart-label').value
                };
                widget = await createChartWidget(widgetType, config);
                break;

            case 'pie':
                config = {
                    category: document.getElementById('pie-category').value,
                    value: document.getElementById('pie-value').value
                };
                widget = await createChartWidget('doughnut', config);
                break;

            case 'table':
                config = {
                    limit: parseInt(document.getElementById('table-limit').value)
                };
                widget = await createTableWidget(config);
                break;
        }

        widgets[widgetId] = {
            type: widgetType,
            config: config,
            widget: widget
        };

        addWidgetToGrid(widgetId, widgetType, widget);
        closeSettings();
        showNotification('Widget added successfully!');
        saveLayoutToLocalStorage();
    } catch (error) {
        console.error('Error adding widget:', error);
        showNotification('Error adding widget', 'error');
    }
}

function addWidgetToGrid(widgetId, widgetType, widget, layoutNode = null) {
    const gridElement = document.querySelector('.grid-stack');

    const item = document.createElement('div');
    item.className = 'grid-stack-item';
    item.setAttribute('gs-id', widgetId);
    // Remove inline styles to prevent GridStack rendering issues
    
    if (layoutNode) {
        if (layoutNode.x !== undefined) item.setAttribute('gs-x', layoutNode.x);
        if (layoutNode.y !== undefined) item.setAttribute('gs-y', layoutNode.y);
        if (layoutNode.w !== undefined) item.setAttribute('gs-w', layoutNode.w);
        if (layoutNode.h !== undefined) item.setAttribute('gs-h', layoutNode.h);
    } else {
        item.setAttribute('gs-w', widgetType === 'kpi' ? '3' : '5');
        item.setAttribute('gs-h', widgetType === 'kpi' ? '2' : '4');
    }

    const content = document.createElement('div');
    content.className = 'grid-stack-item-content';

    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `
        <h3>${widgetTypesMap[widgetType]}</h3>
        <div class="widget-actions">
            <button class="widget-action-btn" onclick="window.openWidgetSettings('${widgetId}')">⚙️</button>
            <button class="widget-action-btn" onclick="window.removeWidget('${widgetId}')">🗑️</button>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'widget-body';
    body.innerHTML = widget.html;

    content.appendChild(header);
    content.appendChild(body);
    item.appendChild(content);

    hideEmptyState();
    gridStack.addWidget(item);

    if (widget.chartType) {
        setTimeout(() => {
            const canvas = body.querySelector('canvas');
            if (canvas) {
                renderChart(canvas, widget.chartType, widget.data);
            }
        }, 100);
    }
}

function openWidgetSettings(widgetId) {
    const widget = widgets[widgetId];
    if (!widget) return;

    const modal = document.getElementById('widget-settings-modal');
    const content = document.getElementById('widget-settings-content');

    let html = '';

    switch (widget.type) {
        case 'kpi':
            html = `
                <div class="settings-group">
                    <label>Metric Type</label>
                    <select id="settings-metric-type">
                        <option value="sum" ${widget.config.metric === 'sum' ? 'selected' : ''}>Sum</option>
                        <option value="avg" ${widget.config.metric === 'avg' ? 'selected' : ''}>Average</option>
                        <option value="count" ${widget.config.metric === 'count' ? 'selected' : ''}>Count</option>
                        <option value="max" ${widget.config.metric === 'max' ? 'selected' : ''}>Maximum</option>
                        <option value="min" ${widget.config.metric === 'min' ? 'selected' : ''}>Minimum</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Field</label>
                    <select id="settings-kpi-field">
                        <option value="total_amount" ${widget.config.field === 'total_amount' ? 'selected' : ''}>Total Amount</option>
                        <option value="quantity" ${widget.config.field === 'quantity' ? 'selected' : ''}>Quantity</option>
                        <option value="unit_price" ${widget.config.field === 'unit_price' ? 'selected' : ''}>Unit Price</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label>Label</label>
                    <input type="text" id="settings-kpi-label" value="${widget.config.label}">
                </div>
                <button class="btn-save-settings" onclick="window.saveWidgetSettings('${widgetId}')">Save Settings</button>
            `;
            break;

        case 'table':
            html = `
                <div class="settings-group">
                    <label>Records to Display</label>
                    <input type="number" id="settings-table-limit" min="1" max="20" value="${widget.config.limit}">
                </div>
                <button class="btn-save-settings" onclick="window.saveWidgetSettings('${widgetId}')">Save Settings</button>
            `;
            break;
    }

    content.innerHTML = html;
    modal.classList.add('show');

    window.saveWidgetSettings = (id) => saveWidgetSettings(id);
}

function closeWidgetSettings() {
    document.getElementById('widget-settings-modal').classList.remove('show');
}

async function saveWidgetSettings(widgetId) {
    const widget = widgets[widgetId];
    if (!widget) return;

    try {
        switch (widget.type) {
            case 'kpi':
                widget.config.metric = document.getElementById('settings-metric-type').value;
                widget.config.field = document.getElementById('settings-kpi-field').value;
                widget.config.label = document.getElementById('settings-kpi-label').value;
                break;

            case 'table':
                widget.config.limit = parseInt(document.getElementById('settings-table-limit').value);
                break;
        }

        closeWidgetSettings();
        showNotification('Settings saved!');
        saveLayoutToLocalStorage();
    } catch (error) {
        console.error('Error saving widget settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

function removeWidget(widgetId) {
    if (!confirm('Remove this widget?')) return;

    delete widgets[widgetId];
    
    // Find the GridStack node explicitly through the engine
    const nodes = gridStack.engine.nodes;
    const targetNode = nodes.find(n => n.el && n.el.getAttribute('gs-id') === widgetId);
    
    if (targetNode && targetNode.el) {
        gridStack.removeWidget(targetNode.el);
    } else {
        // Fallback to DOM query if engine search fails
        const item = document.querySelector(`[gs-id="${widgetId}"]`);
        if (item) {
            gridStack.removeWidget(item, false);
        }
    }
    
    showNotification('Widget removed');
    saveLayoutToLocalStorage();
}

function saveLayoutToLocalStorage() {
    const layout = gridStack.save();
    const data = {
        layout,
        widgets,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('dashboard-layout', JSON.stringify(data));
}

async function saveDashboard() {
    const data = {
        layout: gridStack.save(),
        widgets,
        timestamp: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Dashboard layout saved!');
}

async function loadDashboard() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        try {
            const file = e.target.files[0];
            const text = await file.text();
            const data = JSON.parse(text);

            widgets = deepClone(data.widgets);

            document.querySelector('.grid-stack').innerHTML = '';
            gridStack.removeAll();

            for (const [widgetId, widget] of Object.entries(widgets)) {
                let renderedWidget = {};

                switch (widget.type) {
                    case 'kpi':
                        renderedWidget = await createKPIWidget(widget.config);
                        break;
                    case 'bar':
                    case 'line':
                    case 'area':
                    case 'scatter':
                    case 'pie':
                        renderedWidget = await createChartWidget(widget.type, widget.config);
                        break;
                    case 'table':
                        renderedWidget = await createTableWidget(widget.config);
                        break;
                }

                const layoutNode = data.layout ? data.layout.find(n => n.id === widgetId) : null;
                addWidgetToGrid(widgetId, widget.type, renderedWidget, layoutNode);
            }

            showNotification('Dashboard loaded successfully!');
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showNotification('Error loading dashboard', 'error');
        }
    };
    input.click();
}

async function loadSavedLayout() {
    const saved = localStorage.getItem('dashboard-layout');
    if (!saved) {
        showEmptyState();
        return;
    }

    try {
        const data = JSON.parse(saved);
        widgets = deepClone(data.widgets);

        gridStack.removeAll();

        for (const [widgetId, widget] of Object.entries(widgets)) {
            let renderedWidget = {};

            switch (widget.type) {
                case 'kpi':
                    renderedWidget = await createKPIWidget(widget.config);
                    break;
                case 'bar':
                case 'line':
                case 'area':
                case 'scatter':
                case 'pie':
                    renderedWidget = await createChartWidget(widget.type, widget.config);
                    break;
                case 'table':
                    renderedWidget = await createTableWidget(widget.config);
                    break;
            }

            const layoutNode = data.layout ? data.layout.find(n => n.id === widgetId) : null;
            addWidgetToGrid(widgetId, widget.type, renderedWidget, layoutNode);
        }
    } catch (error) {
        console.error('Error loading saved layout:', error);
        showEmptyState();
    }
}

function showEmptyState() {
    const container = document.getElementById('empty-state-container');
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state-wrapper">
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h3>No widgets yet</h3>
                <p>Click "⚙️ Configure Dashboard" to add your first widget and start building your dashboard.</p>
            </div>
        </div>
    `;
}

function hideEmptyState() {
    const container = document.getElementById('empty-state-container');
    if (container) container.innerHTML = '';
}

function applyDateFilter(filter) {
    currentFilter = filter;
    const range = getDateRange(filter);

    if (range) {
        console.log(`Filter applied: ${filter}`, range);
    }

    showNotification(`Filter applied: ${filter}`);
}