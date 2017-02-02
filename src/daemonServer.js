import Server from './server';

 let args = process.argv.slice(2);
 Server.startServer(args[1]);
