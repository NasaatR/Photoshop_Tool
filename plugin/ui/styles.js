'use strict';
module.exports = `
#photoshoptool {
 --bg:var(--uxp-host-background-color,#252525); --fg:var(--uxp-host-text-color,#ececec);
 --muted:var(--uxp-host-text-color-secondary,#b0b0b0); --border:var(--uxp-host-border-color,#494949);
 --surface:var(--uxp-host-background-color,#2c2c2c); --raised:var(--uxp-host-widget-background-color,var(--uxp-host-background-color,#333333));
 --primary:var(--uxp-host-widget-hover-background-color,#3c3c3c); --primary-border:var(--uxp-host-border-color,#737373); --status-bg:var(--uxp-host-background-color,#202020);
 --hover:var(--uxp-host-widget-hover-background-color,#414141); --size:44px; --radius:0px; --small-radius:0px;
 --success:#a2ccac; --error:#efaaa4;
 box-sizing:border-box; display:flex; flex-direction:column; flex:1; width:100%; height:100%; min-width:0; min-height:0;
 padding:8px; margin:0; overflow:hidden; background-color:var(--bg); color:var(--fg); font-size:12px; font-family:system-ui,sans-serif;
}
#photoshoptool * {box-sizing:border-box;}
#photoshoptool [hidden] {display:none !important;}
#photoshoptool.pt-dark {--bg:#252525;--fg:#ececec;--muted:#b0b0b0;--border:#494949;--hover:#414141;--surface:#2c2c2c;--raised:#333333;--primary:#3c3c3c;--primary-border:#737373;--status-bg:#202020;}
#photoshoptool.pt-light {--bg:#eeeeee;--fg:#252525;--muted:#626262;--border:#c2c2c2;--hover:#d8d8d8;--surface:#e6e6e6;--raised:#f8f8f8;--primary:#ffffff;--primary-border:#999999;--status-bg:#e3e3e3;--success:#27663b;--error:#a0372e;}
#photoshoptool.pt-roomy {--size:50px;}
#photoshoptool.pt-soft {--radius:10px;--small-radius:6px;}
#photoshoptool .pt-scroll {flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding-bottom:3px;}
#photoshoptool .pt-toolbar {display:flex;align-items:center;justify-content:space-between;min-width:0;min-height:24px;margin-bottom:6px;}
#photoshoptool .pt-eyebrow {font-size:10px;font-weight:600;letter-spacing:1px;color:var(--muted);padding-left:2px;}
#photoshoptool .pt-actions {display:flex;flex-wrap:wrap;min-width:0;margin-right:-6px;}
#photoshoptool .pt-control {display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border);border-radius:var(--small-radius);background-color:transparent;color:var(--fg);padding:0;margin:0;cursor:pointer;outline:none;}
#photoshoptool .pt-control:hover {background-color:var(--hover);}
#photoshoptool .pt-control:focus {border-color:var(--fg);outline:1px solid var(--fg);outline-offset:1px;}
#photoshoptool .pt-control:active {background-color:var(--primary);}
#photoshoptool .pt-control[aria-disabled="true"] {opacity:.45;cursor:default;}
#photoshoptool .pt-action {flex:1;min-width:44px;height:var(--size);margin-right:6px;margin-bottom:6px;border-radius:var(--radius);background-color:var(--raised);}
#photoshoptool .pt-primary {background-color:var(--primary);border-color:var(--primary-border);}
#photoshoptool .pt-icon {display:block;width:22px;height:22px;fill:currentColor;pointer-events:none;flex-shrink:0;}
#photoshoptool .pt-tools {display:flex;align-items:center;flex-shrink:0;}
#photoshoptool .pt-small {width:26px;height:24px;margin-left:3px;border-color:transparent;}
#photoshoptool .pt-small .pt-icon {width:16px;height:16px;}
#photoshoptool .pt-small[aria-pressed="true"],#photoshoptool .pt-small[aria-expanded="true"] {background-color:var(--raised);border-color:var(--border);}
#photoshoptool .pt-caption {display:none;}
#photoshoptool.pt-labels .pt-action {height:70px;flex-direction:column;padding:7px 4px;}
#photoshoptool.pt-labels.pt-roomy .pt-action {height:78px;}
#photoshoptool.pt-labels .pt-caption {display:block;margin-top:6px;font-size:10px;font-weight:500;line-height:12px;text-align:center;white-space:normal;max-width:100%;}
#photoshoptool[data-tool-layout="grid"] .pt-action {flex:1 0 calc(50% - 6px);max-width:calc(50% - 6px);}
#photoshoptool .pt-status-row {display:flex;align-items:center;min-width:0;min-height:30px;margin-top:1px;padding:0 3px 0 7px;border:1px solid var(--border);border-radius:var(--small-radius);background-color:var(--status-bg);}
#photoshoptool .pt-status {flex:1;min-width:0;min-height:28px;display:flex;align-items:center;cursor:pointer;}
#photoshoptool .pt-status:focus {outline:1px solid var(--fg);outline-offset:1px;border-radius:var(--small-radius);}
#photoshoptool .pt-dot {width:5px;height:5px;margin-right:7px;border-radius:3px;flex-shrink:0;background-color:var(--muted);}
#photoshoptool .pt-status-row[data-state="success"] .pt-dot {background-color:var(--success);}
#photoshoptool .pt-status-row[data-state="error"] .pt-dot {background-color:var(--error);}
#photoshoptool .pt-status-row[data-state="error"] .pt-status-text {color:var(--error);}
#photoshoptool .pt-status-text {display:block;max-width:100%;min-width:0;font-size:11px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);padding-bottom:1px;}
#photoshoptool .pt-detail {font-size:11px;line-height:16px;white-space:pre-wrap;word-wrap:break-word;color:var(--muted);padding:7px 3px 2px;}
#photoshoptool #options {margin-top:9px;padding:0 9px 9px;border:1px solid var(--border);border-radius:var(--radius);background-color:var(--surface);}
#photoshoptool .pt-heading {font-size:11px;font-weight:600;margin:12px 0 6px;padding-top:8px;border-top:1px solid var(--border);}
#photoshoptool .pt-heading:first-child {border-top:0;padding-top:0;}
#photoshoptool label {display:flex;flex-wrap:nowrap;align-items:center;min-height:30px;width:100%;font-size:11px;line-height:16px;}
#photoshoptool label span {min-width:0;white-space:normal;}
#photoshoptool input[type="checkbox"] {width:16px;height:16px;margin:0 7px 0 0;flex-shrink:0;}
#photoshoptool input[type="number"] {width:48px;height:27px;margin-left:auto;font-size:11px;flex-shrink:0;border-radius:var(--small-radius);}
#photoshoptool .pt-choice-group {display:flex;width:100%;margin:3px 0 7px;}
#photoshoptool .pt-choice {flex:1;min-width:0;min-height:28px;padding:3px 2px;font-size:10px;margin-right:3px;}
#photoshoptool .pt-choice:last-child {margin-right:0;}
#photoshoptool .pt-choice[aria-pressed="true"] {background-color:var(--raised);border-color:var(--primary-border);font-weight:600;}
#photoshoptool .pt-text {min-height:29px;width:100%;justify-content:flex-start;padding:5px 7px;margin-top:6px;font-size:11px;background-color:var(--raised);}
#photoshoptool .pt-hint {font-size:11px;line-height:16px;margin:6px 0;color:var(--muted);word-wrap:break-word;}
#photoshoptool .pt-footer {display:flex;align-items:center;justify-content:space-between;flex-shrink:0;min-height:19px;padding:4px 2px 0;color:var(--muted);font-size:10px;line-height:13px;}
#photoshoptool .pt-version {font-size:9px;}
`;
