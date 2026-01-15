// CSV Export Utility
// Exports event data to CSV format

// class CSVExporter {
//     constructor() {
//         this.delimiter = ',';
//         this.lineBreak = '\n';
//     }

//     // Escape CSV value
//     escapeCSV(value) {
//         if (value === null || value === undefined) return '';
        
//         const str = String(value);
        
//         // If contains delimiter, quotes, or newlines, wrap in quotes and escape quotes
//         if (str.includes(this.delimiter) || str.includes('"') || str.includes('\n')) {
//             return '"' + str.replace(/"/g, '""') + '"';
//         }
        
//         return str;
//     }

//     // Flatten nested object to single level with dot notation
//     flattenObject(obj, prefix = '') {
//         const flattened = {};
        
//         for (const key in obj) {
//             if (!obj.hasOwnProperty(key)) continue;
            
//             const value = obj[key];
//             const newKey = prefix ? `${prefix}.${key}` : key;
            
//             if (value === null || value === undefined) {
//                 flattened[newKey] = '';
//             } else if (typeof value === 'object' && !Array.isArray(value)) {
//                 Object.assign(flattened, this.flattenObject(value, newKey));
//             } else if (Array.isArray(value)) {
//                 flattened[newKey] = JSON.stringify(value);
//             } else {
//                 flattened[newKey] = value;
//             }
//         }
        
//         return flattened;
//     }

//     // Convert events array to CSV string
//     eventsToCSV(events) {
//         if (!events || events.length === 0) {
//             return 'No data available';
//         }

//         // Flatten all events
//         const flattenedEvents = events.map(event => this.flattenObject(event));

//         // Get all unique keys across all events
//         const allKeys = new Set();
//         flattenedEvents.forEach(event => {
//             Object.keys(event).forEach(key => allKeys.add(key));
//         });

//         const keys = Array.from(allKeys).sort();

//         // Create header row
//         const header = keys.map(key => this.escapeCSV(key)).join(this.delimiter);

//         // Create data rows
//         const rows = flattenedEvents.map(event => {
//             return keys.map(key => this.escapeCSV(event[key])).join(this.delimiter);
//         });

//         return header + this.lineBreak + rows.join(this.lineBreak);
//     }

//     // Convert workflows to CSV with workflow metadata
//     workflowsToCSV(workflows) {
//         if (!workflows || workflows.length === 0) {
//             return 'No workflows available';
//         }

//         const allEvents = [];
        
//         workflows.forEach((workflow, workflowIndex) => {
//             workflow.forEach((event, eventIndex) => {
//                 const flatEvent = this.flattenObject(event);
//                 flatEvent.workflow_id = workflowIndex + 1;
//                 flatEvent.event_sequence = eventIndex + 1;
//                 flatEvent.workflow_total_events = workflow.length;
//                 allEvents.push(flatEvent);
//             });
//         });

//         return this.eventsToCSV(allEvents);
//     }

//     // Download CSV file
//     downloadCSV(csvContent, filename = 'task_mining_data.csv') {
//         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//         const url = URL.createObjectURL(blob);
        
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = filename;
//         link.style.display = 'none';
        
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
        
//         URL.revokeObjectURL(url);
//     }

//     // Export events with timestamp in filename
//     exportEvents(events) {
//         const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
//         const filename = `task_mining_events_${timestamp}.csv`;
//         const csv = this.eventsToCSV(events);
//         this.downloadCSV(csv, filename);
//     }

//     // Export workflows with timestamp in filename
//     exportWorkflows(workflows) {
//         const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
//         const filename = `task_mining_workflows_${timestamp}.csv`;
//         const csv = this.workflowsToCSV(workflows);
//         this.downloadCSV(csv, filename);
//     }

//     // Generate summary statistics CSV
//     generateSummaryCSV(events) {
//         const eventTypes = {};
//         const urlCounts = {};
//         let totalEvents = events.length;

//         events.forEach(event => {
//             // Count event types
//             eventTypes[event.event] = (eventTypes[event.event] || 0) + 1;
            
//             // Count URLs
//             if (event.url) {
//                 urlCounts[event.url] = (urlCounts[event.url] || 0) + 1;
//             }
//         });

//         // Create summary data
//         const summaryData = [
//             { metric: 'Total Events', value: totalEvents },
//             { metric: 'Unique Event Types', value: Object.keys(eventTypes).length },
//             { metric: 'Unique URLs', value: Object.keys(urlCounts).length },
//             { metric: 'Time Range', value: events.length > 0 ? 
//                 `${new Date(events[0].timestamp).toLocaleString()} - ${new Date(events[events.length - 1].timestamp).toLocaleString()}` : 'N/A' }
//         ];

//         // Add event type breakdown
//         Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
//             summaryData.push({ metric: `Event: ${type}`, value: count });
//         });

//         return this.eventsToCSV(summaryData);
//     }

//     // Export summary
//     exportSummary(events) {
//         const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
//         const filename = `task_mining_summary_${timestamp}.csv`;
//         const csv = this.generateSummaryCSV(events);
//         this.downloadCSV(csv, filename);
//     }
// }

// // Export for use in dashboard
// if (typeof window !== 'undefined') {
//     window.CSVExporter = CSVExporter;
// }
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = CSVExporter;
// }
