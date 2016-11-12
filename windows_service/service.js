var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'MBTiles-Server',
  description: 'MBTILES Server',
  script: 'C:\\mbtiles-server\\server.js',
  flags:'C:\\mbtiles-server\\server.js 4444'
});


// Listen for the "uninstall" event so we know when it's done.
// svc.on('uninstall',function(){
//   console.log('Uninstall complete.');
//   console.log('The service exists: ',svc.exists);
// });

// // Uninstall the service.
// svc.uninstall();


// Listen for the "install" event, which indicates the
//process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();