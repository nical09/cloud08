/*------------------------------------------------------------------------------------------------------/
| Program: ParcelLoader  Trigger: Batch    
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

var fileName = "Parcel_CSV_Test_File.csv";
var emailAddress = "nalbert@accela.com";

if (deleteFile == "Y") deleteFile = true; else deleteFile = false;

lineFormat = ["PARCEL_NUM", "SOURCE_SEQ_NBR", "BLOCK", "BOOK", "CENSUS_TRACT", "COUNCIL_DISTRICT", "EXEMPT_VALUE", "GIS_SEQ_NBR", "IMPROVED_VALUE",
    "LAND_VALUE", "LEGAL_DESC", "LOT", "MAP_NBR", "MAP_REF", "PAGE", "PARCEL", "PARCEL_AREA", "PLAN_AREA", "SUPERVISOR_DISTRICT", "SUBDIVISION",
    "TOWNSHIP", "RANGE", "SECTION", "TRACT", "PRIMARY", "INSPECTION_DISTRICT", "TEMPLATE_NAME", "ATTRIBUTE_NAME", "ATTRIBUTE_VALUE"];

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
				// aa.print(line);
				processLine(String(line));
				//break; //TESTING
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
		
		parcelModelResult =  aa.proxyInvoker.newInstance("com.accela.aa.aamain.parcel.ParcelModel");
		if (parcelModelResult.getSuccess()) {
			var newParcel = parcelModelResult.getOutput();
				
			// set for all addresses
			newParcel.setAuditDate(new Date());
			newParcel.setAuditID("ADMIN");
			newParcel.setAuditStatus("A");
			newParcel.setParcelStatus("A");
			
			pieces = line.split("|");   // changed to pipe delimited per A. Winningham request
			for (pIndex in pieces) {
				pieceValue = pieces[pIndex];
				// logDebug("pieceValue: " + pieceValue);
				pieceDataName = lineFormat[pIndex];
				logDebug("line value: " + pieceDataName + ", " + pieceValue);
				
				if (String(pieceValue).trim() == "") continue;

				switch (pieceDataName) {
					case "PARCEL_NUM": 
							newParcel.setParcelNumber(String(pieceValue).trim());
							var parcelNum = String(pieceValue).trim();
						break;
					case "SOURCE_SEQ_NBR": 
							newParcel.setSourceSeqNumber(aa.util.parseLong(String(pieceValue)));
							var seqNum = (aa.util.parseLong(String(pieceValue)));
						break;
					case "BLOCK":
							newParcel.setBlock(String(pieceValue).trim());
						break;
					case "BOOK":
							newParcel.setBook(String(pieceValue).trim());
						break;
					case "CENSUS_TRACT":
							newParcel.setCensusTract(String(pieceValue).trim());
						break;
					case "COUNCIL_DISTRICT":
							newParcel.setCouncilDistrict(String(pieceValue).trim());
						break;
					case "EXEMPT_VALUE":
							newParcel.setExemptValue(parseFloat(String(pieceValue).trim()));
						break;
					case "GIS_SEQ_NBR":
							newParcel.setGisSeqNo(aa.util.parseLong(String(pieceValue)));
						break;
					case "IMPROVED_VALUE":
							newParcel.setImprovedValue(parseFloat(String(pieceValue).trim()));
						break;
					case "LAND_VALUE":
							newParcel.setLandValue(parseFloat(String(pieceValue).trim()));
						break;
					case "LEGAL_DESC" :
							newParcel.setLegalDesc(String(pieceValue).trim());
						break;
					case "LOT":
							newParcel.setLot(String(pieceValue).trim());
						break;
					case "MAP_NBR":
							newParcel.setMapNo(String(pieceValue).trim());
							break;
					case "MAP_REF":
							newParcel.setMapRef(String(pieceValue).trim());
							break;
					case "PAGE":
							newParcel.setPage(String(pieceValue).trim());
							break;
					case "PARCEL":
							newParcel.setParcel(String(pieceValue).trim());
							break;
					case "PARCEL_AREA":
							newParcel.setParcelArea(parseFloat(String(pieceValue).trim()));
							break;
					case "PLAN_AREA":
							newParcel.setPlanArea(parseFloat(String(pieceValue).trim()));
							break;
					case "SUPERVISOR_DISTRICT":
							newParcel.setSupervisorDistrict(String(pieceValue).trim());
							var spvrDist = String(pieceValue).trim();
						break;
					case "SUBDIVISION":
							newParcel.setSubdivision(String(pieceValue).trim());
						break;
					case  "TOWNSHIP":
							newParcel.setTownship(String(pieceValue).trim());
						break;
					case "RANGE":
							newParcel.setRange(String(pieceValue).trim());
						break;
					case "SECTION":
							newParcel.setSection(parseInt(String(pieceValue).trim()));
							var section = (parseInt(String(pieceValue).trim()));
						break;
					case  "TRACT":
							newParcel.setTract(String(pieceValue).trim());
						break;
					case "PRIMARY":
							newParcel.setPrimaryParcelFlag(String(pieceValue).trim());
						break;
					case "INSPECTION_DISTRICT":
							newParcel.setInspectionDistrict(String(pieceValue).trim());
							var inspDist = String(pieceValue).trim();
						break;
					default : break;
				}
			}  // loop through file
			
			// determine if parcel record exists
			
			var attributeName;
			var refPrclObj = aa.parcel.getParceListForAdmin(parcelNum, null, null, null, null, null, null, null, null, null);
			if (refPrclObj.getSuccess()) {
				var refPrclArr = refPrclObj.getOutput();
				
				if (refPrclArr.length) {
					
					for(i in refPrclArr){
						var refParcelModel = refPrclArr[i].getParcelModel();
						var refParcelNumber = refParcelModel.getParcelNumber();
						logDebug("parcel exists: " + refParcelNumber);
						var parcelAttributeList = aa.util.newArrayList();
						var parcelAttrList = refParcelModel.getParcelAttribute();
						var parcelAttrListIt = parcelAttrList.iterator();
						while(parcelAttrListIt.hasNext()){
							var parcelAttrObj = parcelAttrListIt.next();
							
							if(attributeName != null && attributeName.equals(parcelAttrObj.getAttributeName())){
								
								parcelAttrObj.setAttributeValue(attributeValue);
								logDebug("Parcel Attribute " + parcelAttrObj.getAttributeName() + " updated value to " + attributeValue);
							}
							parcelAttributeList.add(parcelAttrObj);
						}
						
						// load model with edited fields
						refParcelModel.setInspectionDistrict(inspDist);
						//refParcelModel.setSupervisorDistrict(spvrDist);
						// need to add rest of fields for update
						// refParcelModel.setSection(section);    no function for this in ParcelInfoModel from getParceListForAdmin
						// refParcelModel.setTownship("Jupiter"); no function for this in ParcelInfoModel from getParceListForAdmin
						
						// this throws error - JavaException: com.accela.aa.exception.SharingConflictException: ParcelUpdateConflictException
						var pb = aa.proxyInvoker.newInstance("com.accela.aa.aamain.parcel.ParcelBusiness").getOutput();
						var pResult = pb.editParcelWithAttributes(aa.getServiceProviderCode, refParcelModel, parcelAttributeList, "ADMIN");

						if (pResult.getSuccess()){
							logDebug("Successfully UPDATED parcel " + parcelNum);
						}else{
							logDebug("ERROR updating parcel " + parcelNum + " " + pResult.getErrorMessage());
						}
					}
				}else{
					// doesn't exist - create new one   
					parcelBusResult =  aa.proxyInvoker.newInstance("com.accela.aa.aamain.parcel.ParcelBusiness");
					if (parcelBusResult.getSuccess()) {
						parcelBus = parcelBusResult.getOutput();
						createResult = parcelBus.createParcelAndReturnParcel(aa.getServiceProviderCode(), newParcel, null, null, "");
						logDebug("Successfully created parcel: " + createResult);
					}else{
						logDebug("Error creating parcel: " + addrResult.getErrorMessage());
					}
				}
			}
		
			
		}// parcelmodel
		
}catch (err){ 
	logDebug("Error processing line " + err); 		
}
}



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
