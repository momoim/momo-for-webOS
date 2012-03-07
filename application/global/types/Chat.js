function Chat() {};

Chat.prototype = {
	id: '',
	sender: {},
	receiver: [],
	timestamp: 0,
	state: 0,
	content: {},
	clientid: Setting.clientID
};

function ChatContent() {};

function ChatText() {};
ChatText.prototype = {
	text: ''
};

function ChatTextLong() {};
ChatTextLong.prototype = {
	text_long: ''
};

function ChatPicture() {};
ChatPicture.prototype = {
	url: ''
};

function ChatAudio() {};
ChatAudio.prototype = {
	url: '',
	duration: 0
};

function ChatFile() {};
ChatFile.prototype = {
	url: '',
	mime: '',
	size: 0,
	name: ''
};

function ChatLocation() {};
ChatLocation.prototype = {
	longitude: 0,
	latitude: 0,
	address: ''
};
