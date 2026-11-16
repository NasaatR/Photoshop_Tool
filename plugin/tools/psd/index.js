'use strict';
module.exports = [
  { group: 'Export & copy', id: 'psd.quick-save', commandId: 'quickPsd', title: 'Quick PSD', label: 'Quick PSD', icon: 'export', defaultVisible: true,
    description: 'Save an image as a layered PSD beside its original and continue in the PSD. Existing PSD/PSB projects are saved in place; other PSD files are never replaced automatically.',
    execute: job => job.services.psd.run(job) }
];
