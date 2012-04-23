function Release(){
    this.api = 'v3.api.momo.im';
    this.mq = {
        host: '121.207.242.244',
        //TODO host: 'mq.momo.im',
        exchange: {
            im: 'momo_im'
        }
    };
};

function Develop(){
    this.api = 'api.simulate.momo.im';
    this.mq = {
        host: '121.207.242.210',
        exchange: {
            im: 'momo_im'
        }
    };
};

var Setting = new Release();
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

//for service
Setting.APP_ID = 'momo.im.app.mojo';
