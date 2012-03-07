VR_FOLDER = "/media/internal/momo/";
VR_EXTENSION = ".amr";

var CaptureHelper = function CaptureHelper(){
	
	/*global objs*/
	var libraries = MojoLoader.require({ name: "mediacapture", version: "1.0" });
	var mediaCaptureObj = libraries.mediacapture.MediaCapture();
	var captureDevice = {};
	var captureFormat = {};
	
	var finishedCallback = {};
	
	/*public*/
	
	function initDeviceAndFormat (bitRate){
		var dev; 
		for (var i=0; i != mediaCaptureObj.captureDevices.length; ++i){
	   		dev = mediaCaptureObj.captureDevices[i];
	    	if (dev.inputtype.indexOf(mediaCaptureObj.INPUT_TYPE_AUDIO)>-1){
	        	break;
	   		}
		}
		
		captureDevice = dev;
		
		var fmt; 
		for (i=0; mediaCaptureObj.supportedAudioFormats.length != i; ++i){
    		fmt = mediaCaptureObj.supportedAudioFormats[i];
			//if (fmt.samplerate == bitRate){
			if(fmt.samplerate == bitRate && fmt.codecs == 'samr') {
				break;
			}
		}
		
		captureFormat = fmt;
		Mojo.Log.info('----CaptureHelper: initted device: '+Object.toJSON(captureDevice) + ' and format: '+
			Object.toJSON(captureFormat));
			
		mediaCaptureObj.addEventListener("audiocapturecomplete", audiocapturecompleteHandler.bind(this) , false);
			
		if (Object.toJSON(captureFormat) != '{}' && Object.toJSON(captureDevice) != '{}'){
			return true;
		}
		else{
			return false;
		}
	
	}
	
	function startRecording(name, callback){
		//var VR_FOLDER = '/media/internal/momo/';

		finishedCallback = callback;
		mediaCaptureObj.load(captureDevice.deviceUri, {"audioCaptureFormat":captureFormat});
		mediaCaptureObj.startAudioCapture(VR_FOLDER + name + VR_EXTENSION, {});
	}
	
	function stopRecording(){
		mediaCaptureObj.stopAudioCapture();
		mediaCaptureObj.unload();
	}
	
	
	var audiocapturecompleteHandler = function(event){
		Mojo.Log.info('----CaptureHelper: Capture complete!');
		finishedCallback({returnValue:true})
	}

	initDeviceAndFormat.call(this, 8000);

	return {
		initDeviceAndFormat : initDeviceAndFormat,
		stopRecording: stopRecording,
		startRecording : startRecording
	};
}