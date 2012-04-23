function Release(){
    this.api = 'v3.api.momo.im';
    this.mq = {
        host: '121.207.242.244',
        exchange: {
            im: 'momo_im'
        }
    };
	this.proxy = '58.22.103.41';
};

function Develop(){
    this.api = 'api.simulate.momo.im';
    this.mq = {
        host: '121.207.242.210',
        exchange: {
            im: 'momo_im'
        }
    };
	this.proxy = '121.207.242.210';
};

function Inside(){
    this.api = 'v3.api.momo.im';
    this.mq = {
        host: '121.207.242.244',
        exchange: {
            im: 'momo_im'
        }
    };
	//this.proxy = '192.168.57.65';
	this.proxy = '121.207.242.210';
};

var Setting = new Release();
//var Setting = new Develop();
//var Setting = new Inside();
Setting.protocol = 'http://';
Setting.clientID = 1;
Setting.CACHE_FOLDER = '/media/internal/.momo';
Setting.cache = {
	audio: Setting.CACHE_FOLDER + '/audio/',
	photo: Setting.CACHE_FOLDER + '/photo/',
	file: Setting.CACHE_FOLDER + '/file/'
};
function guidGenerator(){
    var S4 = function(){
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    var split = "-";
    return (S4() + S4() + split + S4() + split + S4() + split + S4() + split + S4() + S4() + S4());
}
