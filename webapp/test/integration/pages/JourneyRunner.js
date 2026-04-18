sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"useractivitymonitorapplication/test/integration/pages/authenticate_dataMain"
], function (JourneyRunner, authenticate_dataMain) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('useractivitymonitorapplication') + '/test/flp.html#app-preview',
        pages: {
			onTheauthenticate_dataMain: authenticate_dataMain
        },
        async: true
    });

    return runner;
});

