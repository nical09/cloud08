/*------------------------------------------------------------------------------------------------------/
| Program: OwnerLoad  Trigger: Batch    
| Version 1.0 - Base Version. 
| 
| 
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var showMessage = false;				// Set to true to see results in popup window
var disableTokens = false;	
var showDebug = true;					// Set to true to see debug messages in email confirmation
var maxSeconds = 30 * 60;				// number of seconds allowed for batch processing, usually < 5*60
var autoInvoiceFees = "Y";    			// whether or not to invoice the fees added
var useAppSpecificGroupName = false;	// Use Group name when populating App Specific Info Values
var useTaskSpecificGroupName = false;	// Use Group name when populating Task Specific Info Values
var currentUserID = "ADMIN";
var publicUser = null;
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var GLOBAL_VERSION = 2.0

var cancel = false;

var vScriptName = aa.env.getValue("ScriptCode");
var vEventName = aa.env.getValue("EventName");
var timeExpired = false;
var startDate = new Date();
var startTime = startDate.getTime();
var message =	"";						// Message String
var debug = "";							// Debug String
var br = "<BR>";						// Break Tag
var feeSeqList = new Array();			// invoicing fee list
var paymentPeriodList = new Array();	// invoicing pay periods
var AInfo = new Array();
var partialCap = false;
var SCRIPT_VERSION = 3.0
var emailText = "";

var useSA = false;
var SA = null;
var SAScript = null;
var bzr = aa.bizDomain.getBizDomainByValue("MULTI_SERVICE_SETTINGS","SUPER_AGENCY_FOR_EMSE"); 
if (bzr.getSuccess() && bzr.getOutput().getAuditStatus() != "I") { 
    useSA = true;   
    SA = bzr.getOutput().getDescription();
    bzr = aa.bizDomain.getBizDomainByValue("MULTI_SERVICE_SETTINGS","SUPER_AGENCY_INCLUDE_SCRIPT"); 
    if (bzr.getSuccess()) { SAScript = bzr.getOutput().getDescription(); }
    }
    
if (SA) {
    eval(getMasterScriptText("INCLUDES_ACCELA_FUNCTIONS",SA));
    eval(getMasterScriptText(SAScript,SA));
    }
else {
    eval(getMasterScriptText("INCLUDES_ACCELA_FUNCTIONS"));
    }

override = "function logDebug(dstr){ if(showDebug) { aa.print(dstr); emailText+= dstr + \"<br>\"; } }";
eval(override);

function getMasterScriptText(vScriptName)
{
    var servProvCode = aa.getServiceProviderCode();
    if (arguments.length > 1) servProvCode = arguments[1]; // use different serv prov code
    vScriptName = vScriptName.toUpperCase();    
    var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
    try {
        var emseScript = emseBiz.getMasterScript(aa.getServiceProviderCode(),vScriptName);
        return emseScript.getScriptText() + ""; 
        } 
	catch(err)
		{
		return "";
		}
}

function getScriptText(vScriptName)
{
    var servProvCode = aa.getServiceProviderCode();
    if (arguments.length > 1) servProvCode = arguments[1]; // use different serv prov code
    vScriptName = vScriptName.toUpperCase();    
    var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
    try {
        var emseScript = emseBiz.getScriptByPK(servProvCode,vScriptName,"ADMIN");
        return emseScript.getScriptText() + ""; 
        } 
	catch(err)
		{
        return "";
		}
}
/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var batchJobID = aa.batchJob.getJobID().getOutput();
var batchJobName = "" + aa.env.getValue("batchJobName");
/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/

// load parms from Standard Choice
var ftpSite = lookup("APO_LP_LOAD_PARAMETERS", "ftpSite");		
var ftpUser = lookup("APO_LP_LOAD_PARAMETERS", "ftpUser");
var ftpPass = lookup("APO_LP_LOAD_PARAMETERS", "ftpPass");
var ftpPort = lookup("APO_LP_LOAD_PARAMETERS", "ftpPort");
var ftpDirectory = lookup("APO_LP_LOAD_PARAMETERS", "ftpDirectory");
var deleteFile = lookup("APO_LP_LOAD_PARAMETERS", "deleteFile");

// load parms from Batch Engine job
var fileName = getParam("fileName");
var emailAddress = getParam("emailAddress");

var fileName = "Owner_CSV_Test_File.csv";
var emailAddress = "nalbert@accela.com"; 

if (deleteFile == "Y") deleteFile = true; else deleteFile = false;

lineFormat = ["PARCEL_NUM","SOURCE_SEQ_NBR","TITLE", "FULL_NAME", "FIRST_NAME", "MIDDLE_NAME", "LAST_NAME","ADDRESS_1","ADDRESS_2", "ADDRESS_3",
   "CITY",  "STATE", "ZIP", "COUNTRY", "PHONE", "FAX", "MAIL_ADDRESS_1", "MAIL_ADDRESS_2", "MAIL_ADDRESS_3", "MAIL_CITY", "MAIL_STATE",
   "MAIL_ZIP", "MAIL_COUNTRY", "TAX_ID", "EMAIL", "PRIMARY"];

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
| 
/-----------------------------------------------------------------------------------------------------*/

try{
	logDebug("Start of Job");

	mainProcess();

logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");

if (emailAddress.length)
	// aa.sendMail("noreply@accela.com", emailAddress, "", batchJobName + " Results", emailText);
	email(emailAddress, "noreply@accela.com", batchJobName + " Results", emailText);

} catch (err) {
	logDebug("ERROR: " + err.message + " In " + batchJobName + " Line " + err.lineNumber);
	logDebug("Stack: " + err.stack);
}

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
function mainProcess() {
	// get the file
	cs = aa.proxyInvoker.newInstance("com.accela.aa.util.FTPUtil").getOutput();
	FTPUtil = cs;
	try {
		aa.util.deleteFile("c:\\temp\\data.txt"); // delete it if it exists
		ftpClient = new Packages.org.apache.commons.net.ftp.FTPClient;
		ftpClient.connect(ftpSite);
		ftpClient.login(ftpUser, ftpPass);
		ftpClient.changeWorkingDirectory(ftpDirectory);
		ftpClient.setFileType(0); //ascii
		ftpClient.enterLocalPassiveMode();
		fout = new java.io.FileOutputStream("c:\\temp\\data.txt");
		ftpClient.retrieveFile(fileName, fout);
		fout.flush();
		fout.close();
		if (deleteFile) ftpClient.deleteFile(fileName);
		ftpClient.logout();
		ftpClient.disconnect();
	}
	catch (err) {
		logDebug("Error getting file from FTP site : " + err);
		return;
	}
	
	try {
		docString = openDocument("c:\\temp\\data.txt");
		fContent = "";
		if (docString) {
			while (docString.hasNextLine()) {
				if (elapsed() > maxSeconds) { // only continue if time hasn't expired
					logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
					timeExpired = true ;
					break; 
				}
				
				line = docString.nextLine();
				
				// process the line
				var ownerArray = new Array();
				var ownerArray = processLine(String(line));
				
				// create new owner and xref with parcel
				createNewOwner(ownerArray);
				
			}
		}
	}
	catch (err) {
		logDebug("Error processing file : " + err);
	}
	
	logDebug("Processed " + fileName);
	aa.util.deleteFile("c:\\temp\\data.txt");
}

function processLine(line) {
	try {
		
		ownerModelResult =  aa.proxyInvoker.newInstance("com.accela.aa.aamain.owner.OwnerModel");
		if (ownerModelResult.getSuccess()) {
				newOwner = ownerModelResult.getOutput();
				
				// set for all owners being loaded
				newOwner.setAuditDate(new Date());
				newOwner.setAuditStatus("A");
				newOwner.setOwnerStatus("A");
				newOwner.setAuditID("ADMIN");
			
			pieces = line.split("|");
			for (pIndex in pieces) {
				pieceValue = pieces[pIndex];
				logDebug("pieceValue: " + pieceValue);
				pieceDataName = lineFormat[pIndex];
				
				if (String(pieceValue).trim() == "") continue;
				// logDebug("pieceDataName: " + pieceDataName);

				switch (pieceDataName) {
					case "PARCEL_NUM":
						var parcelNum = String(pieceValue).trim();
						break;
					case "SOURCE_SEQ_NBR": 
							newOwner.setSourceSeqNumber(aa.util.parseLong(String(pieceValue)));
							var sourceSeqNum = aa.util.parseLong(String(pieceValue));
						break;
					case "TITLE":
							newOwner.setOwnerTitle(String(pieceValue).trim().toUpperCase());
						break;
					case "FIRST_NAME":
							newOwner.setOwnerFirstName(String(pieceValue).trim().toUpperCase());
						break;
					case "MIDDLE_NAME":
							newOwner.setOwnerMiddleName(String(pieceValue).trim().toUpperCase());
						break;
					case "LAST_NAME":
							newOwner.setOwnerLastName(String(pieceValue).trim().toUpperCase());
						break;
					case "FULL_NAME":
							newOwner.setOwnerFullName(String(pieceValue).trim().toUpperCase());
						break;
					case "ADDRESS_1":
							newOwner.setAddress1(String(pieceValue).trim());
						break;
					case "ADDRESS_2":
							newOwner.setAddress2(String(pieceValue).trim());
						break;
					case "ADDRESS_3":
							newOwner.setAddress3(String(pieceValue).trim());
						break;
					case "CITY":
							newOwner.setCity((String(pieceValue).trim()));
						break;
					case "STATE" :
							newOwner.setState(String(pieceValue).trim());
						break;
					case "ZIP":
							newOwner.setZip(String(pieceValue).trim());
						break;
					case "COUNTRY":
							newOwner.setCountry(String(pieceValue).trim());
							break;
					case "PHONE":
							newOwner.setPhone(String(pieceValue).trim());
							break;
					case "FAX":
							newOwner.setFax(String(pieceValue).trim());
							break;
					case "MAIL_ADDRESS_1":
							newOwner.setMailAddress1(String(pieceValue).trim());
							break;
					case "MAIL_ADDRESS_2":
							newOwner.setMailAddress1(String(pieceValue).trim());
							break;
					case "MAIL_ADDRESS_3":
							newOwner.setMailAddress1(String(pieceValue).trim());
							break;
					case "MAIL_CITY":
							newOwner.setMailCity(String(pieceValue).trim());
						break;
					case "MAIL_STATE":
							newOwner.setMailState(String(pieceValue).trim());
						break;
					case  "MAIL_ZIP":
							newOwner.setMailZip(String(pieceValue).trim());
						break;
					case "MAIL_COUNTRY":
							newOwner.setMailCountry(String(pieceValue).trim());
						break;
					case "TAX_ID":
							newOwner.setTaxID(String(pieceValue).trim());
						break;
					case  "EMAIL":
							newOwner.setEmail(String(pieceValue).trim());
						break;
					case "PRIMARY":
							newOwner.setIsPrimary(String(pieceValue).trim());
						break;
					default : break;
				}
			}  // loop line elements, build newOwner model
			
		var returnArray = new Array();
		returnArray.push(parcelNum);
		returnArray.push(sourceSeqNum);
		returnArray.push(newOwner);
		return returnArray;
		} // got owner model 
}catch (err) { 
	logDebug("Error processing line " + err); 
}
} // processLine function

function createNewOwner(ownerArray){
try{	
	for(i in ownerArray){
		var parcel = ownerArray[0];
		var seqNum = ownerArray[1];
		var owner = ownerArray[2];
	}
	var fullName = owner.getOwnerFullName();
	logDebug("fullName: " + fullName);
	
	sgBusiness = aa.proxyInvoker.newInstance("com.accela.sequence.SequenceGeneratorBusiness").getOutput();
	newOwner.setOwnerNumber(sgBusiness.getNextValue("L3OWNERS_SEQ"));
	
// does this owner exist?
	// var refOwnerModel = aa.proxyInvoker.newInstance("com.accela.aa.aamain.owner.RefOwnerModel"); 
	var ownerModel = aa.proxyInvoker.newInstance("com.accela.aa.aamain.owner.OwnerModel"); 
	logDebug("ownerModel: " + ownerModel.getSuccess());
	if (ownerModel.getSuccess()){
		refOwner = ownerModel.getOutput();
		refOwnerList = refOwner.getOwnerList();
		logDebug("length: " + refOwnerList.length);
	
	var ownerExists = ownerModel.getRefOwner(refOwner);
		if (ownerExists.getSuccess()){
			ownerArray = ownerExists.getOutput();
			var numOfOwns = ownerArray.length;
			logDebug("numOfOwns: " + numOfOwns);
			
			/* var existingID = ownerOutput.getOwnerNbr();
			logDebug("existingID: " + existingID); */
		}
	}
	
	
	ownerBusResult =  aa.proxyInvoker.newInstance("com.accela.aa.aamain.owner.OwnerBusiness");
	if (ownerBusResult.getSuccess()) {
		ownerBus = ownerBusResult.getOutput();
		ownerID = ownerBus.createOwner(owner);
		logDebug("Successfully created owner: " + ownerID);
		
		if (parcel != "") {
			logDebug("parcelNum: " + parcel);
			if (ownerID >= 0) {
				logDebug("ownerId: " + ownerID);
				xParOwnResult =  aa.proxyInvoker.newInstance("com.accela.aa.aamain.parcel.XParOwnerModel");
				if (xParOwnResult.getSuccess()) {
					xParOwnModel = xParOwnResult.getOutput();
					xParOwnModel.setOwnerNbr(ownerID);
					xParOwnModel.setAuditDate(new Date());
					xParOwnModel.setAuditStatus("A");
					xParOwnModel.setAuditID("ADMIN");
					xParOwnModel.setParcelNumber(parcel);
					xParOwnModel.setSourceSeqNumber(seqNum);
					ownerBus.createXPOwner(aa.getServiceProviderCode(), xParOwnModel);
					logDebug("Successfully paired with Parcel #: " + parcel);
				}
			}
		}
	}else{
		logDebug("Error creating owner: " + ownerBusResult.getErrorMessage());
	}
}catch (err){
	logDebug("Error creating new owner: " + err);
}	
} // createNewOwner function

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/
function getParam(pParamName) //gets parameter value and logs message showing param value
{
	var ret = "" + aa.env.getValue(pParamName);
	logDebug("Parameter : " + pParamName + " = " + ret);
	return ret;
}

function isNull(pTestValue, pNewValue) {
	if (pTestValue == null || pTestValue == "")
		return pNewValue;
	else
		return pTestValue;
}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000)
}


function openDocument(docFilePath) {
	try
		{
			var file = new java.io.File(docFilePath);   
			var fin = new java.io.FileInputStream(file);
			var vstrin = new java.util.Scanner(fin);
			return (vstrin);
		}
	catch (err)
		{
			logDebug("Error reading CSV document: " + err.message);
			return null;
		}
}  //openDocument	

function logDebug(dstr) {
	aa.print(dstr + "\n")
	aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr)
}
