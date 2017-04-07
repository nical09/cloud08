/*------------------------------------------------------------------------------------------------------/
| Program : INCLUDES_CUSTOM_FEES.js
| Event   : N/A
| Usage   : Script executes on all events. Loops through the Fee Items included in the Fee Schedule
|			configured for the executing record type. Interrogates comments field on each fee item  
|			for a function name. If field populated, master script determines if the event  
|			included in the last parameter for the function matches the event being executed. 
|			If so, the fee script executes. 
|			This program also passes the autoInvoiceFlag to the fee function being executed.
/------------------------------------------------------------------------------------------------------*/
try{
	
/* var vEventName = aa.env.getValue("EventName");
logDebug("vEventName: " + vEventName); */

// get fee schedule for this record type
feeS = aa.finance.getFeeScheduleByCapID(capId).getOutput() + "";
logDebug("feeS: " + feeS);

// get version for this fee schedule
var currentDate = aa.date.getCurrentDate();
listResult = aa.fee.getRefFeeScheduleVersionsByDate(feeS, currentDate);
if (listResult.getSuccess()){
    feeSchedules = listResult.getOutput();
    for(var i=0;i<feeSchedules.length;i++){
        var feeSchedule = feeSchedules[i];
		version = feeSchedule.getVersion();
	}
}
qf = aa.util.newQueryFormat();

// get list of fees for this schedule
refFeeBus = aa.proxyInvoker.newInstance("com.accela.aa.finance.fee.RefFeeBusiness").getOutput();
feeList = refFeeBus.getFeeItemList(servProvCode, feeS, version, "A", qf, "ADMIN").toArray();

for (x in feeList) {
     feeModel = feeList[x];
	 var feeCode = feeModel.getFeeCod()
	 var comments = feeModel.getComments();
	 var autoInvoiceFlag = checkAutoInvoice(feeCode);
	 
	 aa.print("feeCode: " + feeCode);
     aa.print("comments: " + comments);
	 aa.print("autoInvoiceFlag: " + autoInvoiceFlag);
	 
	 if (comments != null){
		cPrefix = comments.substring(0,4);
		aa.print("cPrefix: " + cPrefix);
		if (cPrefix == "func"){
			funcArr = comments.split(";");
			for (x in funcArr){
				var tmpFunc = funcArr[x];
				aa.print ("tmpFunc: " + tmpFunc);
				var executable = new Function(tmpFunc);
				
				// execute valid script
				executable();
			}
		}
	 }
}


}catch(err){
	logDebug("A JavaScript Error occured in the MASTER_FEE_PROCESS: " + err.message);
}
 
// helper functions

function checkAutoInvoice(feeCode){
	var feeItemList = aa.finance.getFeeItemByCapID(capId).getOutput();
	for (x in feeItemList){
		var feeItem = feeItemList[x];
		var thisFeeCode = feeItem.getFeeCod();
		if (feeCode == thisFeeCode){
			var flag = feeItem.getAutoInvoiceFlag();  // Note: No shows up as null, Yes shows up as Y
		}
	}
	return flag;
}

// functions to be executed

function funcFeeByRange(customField, feeAmt, autoInvoice, fEvent){
	var args = arguments.length;
	aa.print("In function. # of args: " + args);
	aa.print("customField: " + customField);
	aa.print("feeAmt: " + feeAmt);
	aa.print("fEvent: " + fEvent);
	if(vEventName = fEvent){
		logDebug("events match, okay to execute: " + vEventName);
	}
	
}
