let projSec_extension_respose = confirm("Please check URL link you are trying to connect to. I suppose it's wrong. Do you want stay on it?");

chrome.runtime.sendMessage({ "projSec_extension_respose": projSec_extension_respose });