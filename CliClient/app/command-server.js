const { BaseCommand } = require('./base-command.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim');

class Command extends BaseCommand {

	usage() {
		return 'server <command>';
	}

	description() {
		return _('Start, stop or check the API server. To specify on which port it should run, set the api.port config variable. Commands are (start|stop|status).');
	}

	async action(args) {
		const command = args.command;

		const ClipperServer = require('lib/ClipperServer');
		const stdoutFn = (s) => this.stdout(s);
		const clipperLogger = new Logger();
		clipperLogger.addTarget('file', { path: Setting.value('profileDir') + '/log-clipper.txt' });
		clipperLogger.addTarget('console', { console: {
			info: stdoutFn,
			warn: stdoutFn,
			error: stdoutFn,
		}});
		ClipperServer.instance().setDispatch(action => {});
		ClipperServer.instance().setLogger(clipperLogger);

		const pidPath = Setting.value('profileDir') + '/clipper-pid.txt';
		const runningOnPort = await ClipperServer.instance().isRunning();

		if (command === 'start') {
			if (runningOnPort) {
				this.stdout(_('Server is already running on port %d', runningOnPort));
			} else {
				await shim.fsDriver().writeFile(pidPath, process.pid.toString(), 'utf-8');
				await ClipperServer.instance().start();
                return 0;
			}
		} else if (command === 'status') {
			this.stdout(runningOnPort ? _('Server is running on port %d', runningOnPort) : _('Server is not running.'));
		} else if (command === 'stop') {
			if (!runningOnPort) {
				this.stdout(_('Server is not running'));
				return;
			}
			const pid = await shim.fsDriver().readFile(pidPath);
			if (!pid) return;
			if (pid != process.pid) {
				this.stdout(_('[PID %d] Server is running on another process (PID %d).', process.pid, pid));
				return;
			}
			await ClipperServer.instance().stop();
		}
	}

}

module.exports = Command;
