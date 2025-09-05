
//Is this still valid script?

var inputsPayload = {};
// topic is a input of type: string
inputsPayload['topic'] = current.getValue('short_description');
var request = {
    executionRequests: [{
        payload: inputsPayload,
        capabilityId: '377d1b7f33c892101b769ac91e5c7b19',
        meta: {
            skillConfigId: '108d93bf33c892101b769ac91e5c7bf9'
        }
    }],
    mode: 'sync'
};
try {
    //var output = sn_one_extend.OneExtendUtil.execute(request);
    //gs.addInfoMessage(JSON.stringify(output));

    var output = sn_one_extend.OneExtendUtil.execute(request)['capabilities'][request.executionRequests[0].capabilityId]['response'];
    var LLMOutput = JSON.parse(output).model_output;

    current.setValue('text', LLMOutput);
    current.update();
} catch (e) {
    gs.error(e);
    gs.addErrorMessage('Something went wrong while executing skill.');
}
action.setRedirectURL(current);