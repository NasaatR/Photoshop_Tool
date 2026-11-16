'use strict';
const { readSelectionDraft } = require('../../core/preferences.js');
module.exports = [
  { group: 'Area & transform', id: 'selection.expand', commandId: 'expandSelection', title: 'Expand Selection', label: 'Expand Selection', icon: 'arrange', defaultVisible: true,
    readOptions: readSelectionDraft, description: 'Expand the current pixel selection outward by the saved amount (8 px by default). Change the amount in Actions settings.',
    execute: job => job.services.selection.expand(job) }
];
