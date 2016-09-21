Meteor.startup(function() {
    var config = {
        webWorkerPath : '../../Packages/cornerstone/client/cornerstoneWADOImageLoaderWebWorker.js',
        taskConfiguration: {
            'decodeTask' : {
                codecsPath: '../../Packages/cornerstone/client/cornerstoneWADOImageLoaderCodecs.js'
            }
        }
    };
    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
});