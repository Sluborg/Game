// blobfit.cjs for one viewport (360x780), so run.cjs can run the three in parallel.
process.env.BLOBFIT_VP = '360x780';
require('./blobfit.cjs');
