// Use Aldeed's meteor-template-extension package to replace the
// default viewportOverlay template.
// See https://github.com/aldeed/meteor-template-extension
var defaultTemplate = 'viewportOverlay';
Template.longitudinalViewportOverlay.replaces(defaultTemplate);

// Add the TimepointName helper to the default template. The
// HTML of this template is replaced with that of longitudinalViewportOverlay
Template[defaultTemplate].helpers({
    timepointName: function() {
        const instance = Template.instance();
        const studyInstanceUid = instance.data.studyInstanceUid;

        // TODO: Find a better way to obtain the timepointApi from the viewer.js template
        const timepointApi = StudyList.timepointApi;
        if (!timepointApi) {
        	return;
        }

        const timepoints = timepointApi.study(studyInstanceUid);
        if (!timepoints || !timepoints.length) {
            return;
        }

        const timepoint = timepoints[0];

        return timepointApi.name(timepoint);
    }
});