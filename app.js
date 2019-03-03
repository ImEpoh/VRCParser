const {app, BrowserWindow} = require('electron');
const fs = require('fs');
const Tail = require('always-tail');

let mainWindow;
const logFolder = process.env.HOME + "\\AppData\\LocalLow\\VRChat\\vrchat\\";
// let status = "Waiting...";
// let world = "Unknown world";
let sendNotifications = true;

const createWindow = () => {
	app.setAppUserModelId(process.execPath);
	mainWindow = new BrowserWindow({width: 800, height: 600});
	mainWindow.loadFile('main.html');
	startParsing();
	mainWindow.on('closed', function () {
		mainWindow = null
	});
};

app.on('ready', createWindow);

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit()
	}
});

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow()
	}
});

const startParsing = () => {
	// updateDiscord();
	getAvailableLogFiles((logs) => {
		const options = {
			interval: 500
		};
		const tail = new Tail(logFolder + logs[0].name, /\n{1,4}\r\n/, options);
		tail.on("line", function (data) {
			parse(data);
			if (mainWindow !== null) {
				mainWindow.webContents.send('log', data)
			}
		});
	});
};

const parse = (line) => {
	// parseWithRegex(line, "Setting custom properties:", /^.+ - {2}Setting custom properties: {(.+)}/, (match) => {
	// 	const json = JSON.parse(match[1]);
	// 	status = json['inVRMode'] === true ? "In VR mode" : "In desktop mode";
	// 	updateDiscord();
	// });
	//
	// parseWithRegex(line, "[RoomManager] Entering Room:", /^.+ - {2}\[RoomManager] Entering Room: (.+)/, (match) => {
	// 	world = match[1];
	// 	updateDiscord();
	// });

	parseWithRegex(line, "[NetworkManager] OnPlayerJoined", /^.+ - {2}\[NetworkManager] OnPlayerJoined (.+)/, (match) => {
		if (sendNotifications === true) {
			mainWindow.webContents.send('notify', JSON.stringify({
				title: "Player joined the instance",
				body: match[1],
				image: "https://i.imgur.com/Rm8ihHI.png"
			}));
		}
	});

	parseWithRegex(line, "[NetworkManager] OnPlayerLeft", /^.+ - {2}\[NetworkManager] OnPlayerLeft (.+)/, (match) => {
		if (sendNotifications === true) {
			mainWindow.webContents.send('notify', JSON.stringify({
				title: "Player left the instance",
				body: match[1],
				image: "https://i.imgur.com/9Qd31WO.png"
			}));
		}
	});

	parseOnly(line, "Room transition time:", () => {
		sendNotifications = false;
	});

	parseOnly(line, "TutorialManager: entered world at", () => {
		sendNotifications = true;
	});

	parseOnly(line, "[NetworkManager] OnDisconnected", () => {
		mainWindow.close();
	});
};

const parseWithRegex = (line, trigger, regex, action) => {
	if (line.indexOf(trigger) !== -1) {
		const match = regex.exec(line);
		if (match !== null && match.length > 0) {
			action(match);
		}
	}
};

const parseOnly = (line, trigger, action) => {
	if (line.indexOf(trigger) !== -1) {
		action();
	}
};

const getAvailableLogFiles = (callback) => {
	const logs = [];
	fs.readdir(logFolder, (err, items) => {
		for (let i = 0; i < items.length; i++) {
			if (items[i].indexOf("output_log_") !== -1) {
				logs.push(items[i]);
				const stats = fs.statSync(logFolder + items[i]);
				logs.push({
					name: items[i],
					modif: new Date(stats.mtime)
				});
			}
		}
		logs.sort((a, b) => {
			return (b.modif === undefined ? 0 : b.modif.getTime()) - (a.modif === undefined ? 0 : a.modif.getTime());
		});
		callback(logs);
	});
};