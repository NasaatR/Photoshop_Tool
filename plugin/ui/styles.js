'use strict';
module.exports = `
#photoshoptool {
 --bg:var(--uxp-host-background-color,#252525); --fg:var(--uxp-host-text-color,#e3e3e3);
 --muted:var(--uxp-host-text-color-secondary,#aaa); --border:var(--uxp-host-border-color,#505050);
 --hover:var(--uxp-host-widget-hover-background-color,#3c3c3c); --size:42px; --radius:0px;
 box-sizing:border-box; display:flex; flex-direction:column; flex:1; width:100%; height:100%; min-width:0; min-height:0;
 padding:8px; margin:0; overflow:hidden; background-color:var(--bg); color:var(--fg); font-size:12px; font-family:system-ui,sans-serif;
}
#photoshoptool * {box-sizing:border-box;}
#photoshoptool [hidden] {display:none !important;}
#photoshoptool.pt-dark {--bg:#252525;--fg:#e3e3e3;--muted:#aaa;--border:#505050;--hover:#3c3c3c;}
#photoshoptool.pt-light {--bg:#efefef;--fg:#242424;--muted:#626262;--border:#b7b7b7;--hover:#dedede;}
#photoshoptool.pt-roomy {--size:48px;}
#photoshoptool.pt-soft {--radius:4px;}
#photoshoptool .pt-toolbar {display:flex;align-items:flex-start;flex-shrink:0;min-width:0;}
#photoshoptool .pt-actions {display:flex;flex-wrap:wrap;min-width:0;flex:1;}
#photoshoptool .pt-control {display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border);border-radius:var(--radius);background-color:transparent;color:var(--fg);padding:0;margin:0;cursor:pointer;outline:none;}
#photoshoptool .pt-control:hover {background-color:var(--hover);}
#photoshoptool .pt-control:focus {border-color:var(--fg);outline:1px solid var(--fg);outline-offset:1px;}
#photoshoptool .pt-control[aria-disabled="true"] {opacity:.45;cursor:default;}
#photoshoptool .pt-action {width:var(--size);height:var(--size);margin-right:6px;margin-bottom:4px;}
#photoshoptool .pt-icon {display:block;width:22px;height:22px;fill:currentColor;pointer-events:none;flex-shrink:0;}
#photoshoptool .pt-tools {display:flex;padding-left:2px;flex-shrink:0;}
#photoshoptool .pt-small {width:25px;height:28px;border-color:transparent;}
#photoshoptool .pt-small .pt-icon {width:17px;height:17px;}
#photoshoptool .pt-small[aria-pressed="true"],#photoshoptool .pt-small[aria-expanded="true"] {border-color:var(--border);}
#photoshoptool .pt-caption {display:none;}
#photoshoptool.pt-labels .pt-action {width:calc(50% - 6px);height:66px;flex-direction:column;padding:4px 2px;}
#photoshoptool.pt-labels .pt-caption {display:block;margin-top:4px;font-size:10px;line-height:13px;text-align:center;white-space:normal;}
#photoshoptool .pt-scroll {flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding-bottom:5px;}
#photoshoptool .pt-status-row {display:flex;align-items:center;min-width:0;}
#photoshoptool .pt-status {flex:1;min-width:0;min-height:26px;display:flex;align-items:center;cursor:pointer;}
#photoshoptool .pt-status-text {display:block;max-width:100%;min-width:0;font-size:11px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);padding-bottom:1px;}
#photoshoptool .pt-detail {font-size:11px;line-height:16px;white-space:pre-wrap;word-wrap:break-word;color:var(--muted);padding:4px 0;}
#photoshoptool .pt-heading {font-size:11px;font-weight:600;margin:8px 0 5px;}
#photoshoptool label {display:flex;flex-wrap:nowrap;align-items:center;min-height:27px;width:100%;font-size:11px;line-height:16px;}
#photoshoptool input[type="checkbox"] {width:16px;height:16px;margin:0 6px 0 0;}
#photoshoptool input[type="number"] {width:48px;height:26px;margin-left:auto;font-size:11px;}
#photoshoptool .pt-choice-group {display:flex;width:100%;margin:3px 0 7px;}
#photoshoptool .pt-choice {flex:1;min-width:0;min-height:27px;font-size:11px;margin-right:3px;}
#photoshoptool .pt-choice[aria-pressed="true"] {border-color:var(--fg);font-weight:600;}
#photoshoptool .pt-text {min-height:28px;width:100%;justify-content:flex-start;padding:4px 6px;margin-top:5px;font-size:11px;}
#photoshoptool .pt-hint {font-size:11px;line-height:16px;margin:5px 0;color:var(--muted);}
#photoshoptool .pt-footer {flex-shrink:0;min-height:15px;padding-top:2px;color:var(--muted);font-size:10px;line-height:13px;}
`;
