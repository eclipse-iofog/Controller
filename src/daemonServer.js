import Server from './server';

let args = process.argv.slice(2);
  
switch (args[0]) {
	case 'start':
		Server.startServer(args[1]);
		break;
}
