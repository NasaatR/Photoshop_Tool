'use strict';
module.exports = `
#photoshoptool {
 --bg:var(--uxp-host-background-color,#252525); --fg:var(--uxp-host-text-color,#ececec);
 --muted:var(--uxp-host-text-color-secondary,#b0b0b0); --border:var(--uxp-host-border-color,#414141);
 --surface:var(--uxp-host-background-color,#2c2c2c); --raised:var(--uxp-host-widget-background-color,var(--uxp-host-background-color,#333333));
 --primary:var(--uxp-host-widget-hover-background-color,#3c3c3c); --primary-border:var(--uxp-host-border-color,#737373); --status-bg:var(--uxp-host-background-color,#202020);
 --hover:var(--uxp-host-widget-hover-background-color,#414141); --size:40px; --layer-size:32px; --layer-label-size:56px; --layer-radius:0px; --radius:0px; --small-radius:0px;
 --tile-border:var(--uxp-host-border-color,#3c3c3c); --field:var(--uxp-host-background-color,#202020); --success:#a2ccac; --error:#efaaa4;
 position:relative; box-sizing:border-box; display:flex; flex-direction:column; flex:1; width:100%; height:100%; min-width:0; min-height:0;
 padding:8px; margin:0; overflow:hidden; background-color:var(--bg); color:var(--fg); font-size:12px; font-family:system-ui,sans-serif;
}
#photoshoptool * {box-sizing:border-box;}
#photoshoptool [hidden] {display:none !important;}
#photoshoptool.pt-dark {--bg:#252525;--fg:#ececec;--muted:#aaaaaa;--border:#414141;--hover:#3d3d3d;--surface:#2c2c2c;--raised:#303030;--primary:#3b3b3b;--primary-border:#606060;--status-bg:#222222;--tile-border:#3b3b3b;--field:#232323;}
#photoshoptool.pt-light {--bg:#eeeeee;--fg:#252525;--muted:#626262;--border:#c2c2c2;--hover:#d8d8d8;--surface:#e6e6e6;--raised:#f8f8f8;--primary:#ffffff;--primary-border:#999999;--status-bg:#e8e8e8;--tile-border:#cfcfcf;--field:#ffffff;--success:#27663b;--error:#a0372e;}
#photoshoptool.pt-roomy {--size:48px;--layer-size:36px;--layer-label-size:62px;}
#photoshoptool.pt-soft {--radius:9px;--small-radius:6px;--layer-radius:7px;}
#photoshoptool .pt-scroll {display:block;position:relative;flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 3px 4px 0;}
#photoshoptool .pt-scroll > * {flex-shrink:0;}
#photoshoptool .pt-scroll:focus {outline:none;}
#photoshoptool .pt-toolbar {display:flex;align-items:center;justify-content:space-between;min-width:0;min-height:26px;margin-bottom:7px;}
#photoshoptool .pt-eyebrow {font-size:10px;font-weight:600;letter-spacing:.8px;color:var(--muted);padding-left:2px;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-right:4px;}
#photoshoptool .pt-actions {display:flex;flex-wrap:wrap;min-width:0;margin-right:-6px;}
#photoshoptool .pt-section {min-width:0;margin-bottom:6px;}
#photoshoptool .pt-section-title {font-size:11px;font-weight:500;color:var(--muted);line-height:16px;margin:3px 0 6px 2px;}
#photoshoptool .pt-control {display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border);border-radius:var(--small-radius);background-color:transparent;color:var(--fg);padding:0;margin:0;cursor:pointer;outline:none;}
#photoshoptool .pt-control:hover {background-color:var(--hover);border-color:var(--muted);}
#photoshoptool .pt-control[data-keyboard-focus="true"]:focus {border-color:var(--fg);outline:1px solid var(--fg);outline-offset:1px;}
#photoshoptool .pt-control:active {background-color:var(--primary);}
#photoshoptool .pt-control[aria-disabled="true"] {opacity:.45;cursor:default;}
#photoshoptool .pt-control[aria-disabled="true"]:hover {border-color:var(--tile-border);background-color:var(--raised);}
#photoshoptool .pt-action {flex:1;min-width:44px;height:var(--size);margin-right:6px;margin-bottom:6px;border-radius:var(--radius);background-color:var(--raised);border-color:var(--tile-border);}
#photoshoptool .pt-primary {background-color:var(--primary);border-color:var(--primary-border);}
#photoshoptool .pt-icon {display:block;width:22px;height:22px;fill:none;pointer-events:none;flex-shrink:0;}
#photoshoptool .pt-format-icon {position:relative;display:block;width:32px;height:30px;flex-shrink:0;pointer-events:none;}
#photoshoptool .pt-format-icon .pt-icon {width:20px;height:20px;margin:0 auto;}
#photoshoptool .pt-format-tag {position:absolute;left:0;bottom:0;width:32px;height:11px;display:block;text-align:center;font-size:10px;line-height:11px;font-weight:700;letter-spacing:0;color:var(--fg);}
#photoshoptool .pt-tools {display:flex;align-items:center;flex-shrink:0;}
#photoshoptool .pt-small {width:28px;height:26px;margin-left:3px;border-color:transparent;}
#photoshoptool .pt-small .pt-icon {width:16px;height:16px;}
#photoshoptool .pt-small[aria-pressed="true"],#photoshoptool .pt-small[aria-expanded="true"] {background-color:var(--raised);border-color:var(--border);}
#photoshoptool .pt-caption {display:none;}
#photoshoptool.pt-labels .pt-action {height:calc(var(--size) + 30px);flex-direction:column;padding:7px 4px;}
#photoshoptool.pt-labels .pt-caption {display:block;margin-top:6px;font-size:10px;font-weight:500;line-height:12px;text-align:center;white-space:normal;max-width:100%;}
#photoshoptool .pt-actions[data-density="standard"] .pt-action {flex:0 0 calc(25% - 6px);max-width:none;min-width:44px;}
#photoshoptool.pt-labels .pt-actions[data-density="standard"] .pt-action {min-width:76px;}
#photoshoptool .pt-actions[data-density="compact"] {margin-right:-4px;}
#photoshoptool .pt-actions[data-density="compact"] .pt-action {flex:0 0 var(--layer-size);width:var(--layer-size);min-width:var(--layer-size);max-width:var(--layer-size);height:var(--layer-size);margin-right:4px;margin-bottom:4px;border-radius:var(--layer-radius);}
#photoshoptool .pt-actions[data-density="compact"] .pt-icon {width:18px;height:18px;}
#photoshoptool.pt-labels .pt-actions[data-density="compact"] .pt-action {flex:1 0 calc(33.333% - 4px);width:auto;min-width:40px;max-width:calc(33.333% - 4px);height:var(--layer-label-size);padding:4px 2px;}
#photoshoptool.pt-labels .pt-actions[data-density="compact"] .pt-caption {margin-top:4px;font-size:10px;line-height:11px;}
#photoshoptool .pt-arrange-bar {padding:0 3px 4px;margin-bottom:5px;border-bottom:1px solid var(--border);}
#photoshoptool[data-arranging="true"] .pt-action {cursor:grab;user-select:none;}
#photoshoptool[data-arranging="true"] .pt-action[data-picked="true"] {border:2px solid var(--fg);background-color:var(--hover);}
#photoshoptool[data-arranging="true"] .pt-action[data-drop="true"] {outline:2px solid var(--fg);outline-offset:-3px;}
#photoshoptool .pt-tooltip {position:absolute;z-index:1000;overflow-y:auto;overflow-x:hidden;padding:4px 7px;border:1px solid var(--border);border-radius:var(--small-radius);background-color:var(--raised);color:var(--fg);font-size:11px;line-height:15px;white-space:normal;word-wrap:break-word;}
#photoshoptool .pt-tooltip-title {font-weight:500;line-height:14px;}
#photoshoptool .pt-status-row {display:flex;align-items:center;min-width:0;min-height:30px;margin-top:1px;padding:0 3px 0 7px;border:1px solid var(--border);border-radius:var(--small-radius);background-color:var(--status-bg);}
#photoshoptool .pt-status {flex:1;min-width:0;min-height:28px;display:flex;align-items:center;cursor:pointer;}
#photoshoptool .pt-status[data-keyboard-focus="true"]:focus {outline:1px solid var(--fg);outline-offset:1px;border-radius:var(--small-radius);}
#photoshoptool .pt-dot {width:5px;height:5px;margin-right:7px;border-radius:3px;flex-shrink:0;background-color:var(--muted);}
#photoshoptool .pt-status-row[data-state="success"] .pt-dot {background-color:var(--success);}
#photoshoptool .pt-status-row[data-state="error"] .pt-dot {background-color:var(--error);}
#photoshoptool .pt-status-row[data-state="error"] .pt-status-text {color:var(--error);}
#photoshoptool .pt-status-text {display:block;max-width:100%;min-width:0;font-size:11px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);padding-bottom:1px;}
#photoshoptool .pt-detail {font-size:11px;line-height:16px;white-space:pre-wrap;word-wrap:break-word;color:var(--muted);padding:7px 3px 2px;}
#photoshoptool #options {margin-top:8px;padding:7px;border:1px solid var(--border);border-radius:var(--radius);background-color:var(--surface);}
#photoshoptool label {display:flex;flex-wrap:nowrap;align-items:center;min-height:30px;width:100%;font-size:12px;line-height:17px;}
#photoshoptool label span {min-width:0;white-space:normal;}
#photoshoptool input[type="checkbox"] {width:16px;height:16px;margin:0 7px 0 0;flex-shrink:0;}
#photoshoptool input[type="number"] {width:54px;height:28px;margin-left:auto;font-size:12px;flex-shrink:0;border:1px solid var(--border);border-radius:var(--small-radius);background-color:var(--field);color:var(--fg);padding:3px 5px;}
#photoshoptool input[aria-invalid="true"] {border-color:var(--error);}
#photoshoptool .pt-choice-group {display:flex;width:100%;margin:3px 0 7px;}
#photoshoptool .pt-choice {flex:1;min-width:0;min-height:30px;padding:4px 3px;font-size:12px;margin-right:3px;background-color:var(--bg);border-color:var(--tile-border);}
#photoshoptool .pt-choice:last-child {margin-right:0;}
#photoshoptool .pt-choice[aria-pressed="true"] {background-color:var(--raised);border-color:var(--primary-border);font-weight:600;}
#photoshoptool .pt-text {min-height:29px;width:100%;justify-content:flex-start;padding:5px 7px;margin-top:6px;font-size:11px;background-color:var(--raised);}
#photoshoptool .pt-hint {font-size:11px;line-height:16px;margin:6px 0;color:var(--muted);word-wrap:break-word;}
#photoshoptool .pt-footer {position:relative;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;min-height:19px;padding:4px 2px 0;color:var(--muted);font-size:10px;line-height:13px;}
#photoshoptool .pt-settings-close {font-size:12px;min-height:28px;min-width:52px;padding:4px 10px;background-color:var(--raised);}
#photoshoptool .pt-settings-tabs {display:flex;flex-wrap:wrap;flex-shrink:0;min-width:0;margin:0;padding:0 0 7px;}
#photoshoptool .pt-tab {flex:1 0 54px;min-width:0;min-height:30px;padding:4px 2px;font-size:12px;margin-right:3px;border-color:transparent;}
#photoshoptool .pt-tab:last-child {margin-right:0;}
#photoshoptool .pt-tab[aria-selected="true"] {background-color:var(--raised);border-color:var(--primary-border);font-weight:600;}
#photoshoptool .pt-setting-row {min-width:0;margin:0 0 10px;}
#photoshoptool .pt-setting-name {font-size:12px;color:var(--muted);margin-bottom:5px;}
#photoshoptool .pt-setting-row .pt-choice-group {margin:0;}
#photoshoptool .pt-value-row {display:flex;align-items:center;min-width:0;margin:2px 0;}
#photoshoptool .pt-value-row .pt-number-field {flex:1;min-width:0;flex-wrap:wrap;}
#photoshoptool .pt-number-value {display:flex;align-items:center;flex-shrink:0;margin-left:auto;}
#photoshoptool .pt-number-value input[type="number"] {width:54px;margin-left:4px;}
#photoshoptool .pt-unit {font-size:11px;color:var(--muted);margin:0 4px;}
#photoshoptool .pt-value-reset {min-height:27px;min-width:34px;margin-left:3px;padding:3px 6px;font-size:11px;}
#photoshoptool .pt-settings-status {font-size:11px;line-height:14px;color:var(--muted);margin:6px 0 0;}
#photoshoptool .pt-settings-footer {display:flex;align-items:center;justify-content:space-between;flex-shrink:0;min-height:36px;padding-top:7px;border-top:1px solid var(--border);}
#photoshoptool .pt-settings-footer .pt-settings-status {flex:1;min-width:0;max-height:70px;overflow-y:auto;margin:0 7px 0 0;word-wrap:break-word;}
#photoshoptool .pt-slider-setting {min-width:0;margin:2px 0 5px;}
#photoshoptool .pt-slider {display:block;width:100%;min-width:0;min-height:24px;margin:0;color:var(--fg);}
#photoshoptool .pt-tool-options {display:block;min-width:0;}
#photoshoptool .pt-visibility-row {min-width:0;max-width:100%;min-height:34px;padding:4px 0;}
#photoshoptool .pt-visibility-row .pt-icon {width:18px;height:18px;margin-right:9px;}
#photoshoptool .pt-visibility-row span {flex:1;}
#photoshoptool .pt-visibility-row input {margin:0 0 0 8px;}
#photoshoptool .pt-settings-card {min-width:0;padding:10px;margin-bottom:8px;border:1px solid var(--tile-border);border-radius:var(--radius);background-color:var(--surface);}
#photoshoptool .pt-card-title {display:flex;align-items:center;min-height:21px;margin-bottom:8px;font-size:12px;font-weight:600;}
#photoshoptool .pt-card-title .pt-icon {width:17px;height:17px;margin-right:7px;color:var(--muted);}
#photoshoptool .pt-settings-card .pt-hint:last-child {margin-bottom:0;}
#photoshoptool .pt-appearance-text {display:block;width:100%;height:150px;min-height:80px;padding:7px;margin-top:7px;border:1px solid var(--border);border-radius:var(--small-radius);background-color:var(--field);color:var(--fg);font-size:11px;overflow:auto;}
#photoshoptool .pt-empty {padding:12px 4px;color:var(--muted);font-size:12px;}
#photoshoptool .pt-report-actions {display:flex;flex-wrap:wrap;min-width:0;}
#photoshoptool .pt-report-actions .pt-text {flex:1 0 95px;min-width:0;padding:4px;margin-right:3px;justify-content:center;font-size:12px;}
#photoshoptool .pt-version {font-size:9px;}
`;
