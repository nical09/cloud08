/*------------------------------------------------------------------------------------------------------/
| Program : INCLUDES_CUSTOM.js
| Event   : N/A
|
| Usage   : Custom Script Include.  Insert custom EMSE Function below and they will be 
|	    available to all master scripts
|
/------------------------------------------------------------------------------------------------------*/

// 6/16/16 JHS, removed.   No longer using INCLUDES_LICENSES, the functions are now in INCLUDES_CUSTOM

//eval( aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput().getScriptByPK(aa.getServiceProviderCode(),"INCLUDES_LICENSES","ADMIN").getScriptText() + "");
if (currentUserID == "ADMIN") showDebug = 3;
showMessage = false;

/**
 * Sets status of License to active Updates expiration date
 * 
 * @example activeLicense(CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            capid
 * @returns {boolean} Indicates whether the activation was successful or not
 *          (true or false)
 */

function activeLicense(capid) {
	if (capid == null || aa.util.instanceOfString(capid)) {
		return false;
	}
	// 1. Set status to "Active", and update expired date.
	var result = aa.expiration.activeLicensesByCapID(capid);
	if (result.getSuccess()) {
		return true;
	} else {
		aa.print("ERROR: Failed to activate License with CAP(" + capid + "): "
			+ result.getErrorMessage());
	}
	return false;
}

/**
 * Adds a License to an existing set If the License already exists in the set,
 * update it with the new record
 * 
 * @example addIssuedLicenseToSet(CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            licId
 */

function addIssuedLicenseToSet(licId) {
	logDebug("in addIssuedLicenseToSet");
	logDebug("appTypeArray[1]: " + appTypeArray[1]);
	
	var setID = appTypeArray[1].toUpperCase() + "_" + sysDateMMDDYYYY + "_"
		+ "ISSUED_LICENSES";
	var setDescription = appTypeArray[1] + " " + "-" + " " + "Issued Licenses";
	var setType = setDescription;

	var issuedLicenseRecordSet = new capSet(setID);
	if (issuedLicenseRecordSet.empty) {
		// This is a new set that needs to be updated with informaiton
		issuedLicenseRecordSet.type = setType
		issuedLicenseRecordSet.status = "Pending"
		issuedLicenseRecordSet.comment = "(addIssuedLicenseToSet) Created via event script from "
			+ licId.getCustomID();
		issuedLicenseRecordSet.update();
		issuedLicenseRecordSet.add(licId);
	} else {
		// This is an existing set so we will add the new record to it
		issuedLicenseRecordSet.add(licId);
	}
}
/**
 * Counts the number of requested labels If the number of labels is greater than
 * 0, increase the fee If the number of labels is 0, keep the fee the same.
 * 
 * @example applyComplianceAssuranceFee();
 * @memberof INCLUDES_CUSTOM
 */

function applyComplianceAssuranceFee() {
	// Introduced by Daniel M.
	var numberOfLabels = 0;
	for (var i = LABELCONTROL.length - 1; i >= 0; i--) {
		if (parseInt(LABELCONTROL[i]["No. of Labels Requested"]) > 0) {
			numberOfLabels += parseInt(LABELCONTROL[i]["No. of Labels Requested"]);
		}
	}

	if (numberOfLabels != 0) {
		updateFee("LABELS_MHPR", "BLD_MH_PR", "FINAL", numberOfLabels, "Y");
	} else {
		updateFee("PRCAM01", "PR_CAM", "FINAL", 1, "Y");
	}
}

//	For Rec types - RN App, LPN App, Nurse Specialty App, Relicensure

function applyStandardConditionsByRecType(){
if (appTypeArray[3] == "Application" || appTypeArray[2] == "Relicensure"){

// Conviction Explanation
	if (AInfo["Have you ever been convicted of a felony"] == "Yes" || AInfo["Have you ever been convicted of a misdemeanor"] == "Yes"
		|| AInfo["Have you ever been convicted of a felony not previously reported"] == "Yes"
		|| AInfo["Have you ever been convicted of a misdemeanor not previously reported to the Department"] ==  "Yes"){
			if (!appHasCondition("Licensing General", "Applied", "Conviction Explanation", null)){
				addStdCondition("Licensing General", "Conviction Explanation");
			}
	}

// Disciplinary Action Statement
	var licenseHistTable = loadASITable("LICENSES IN OTHER STATES");
	var applyCondition = false;
	for (i in licenseHistTable){
		tableRow = licenseHistTable[i];
		sanctions = tableRow["Sanctions Imposed or Disciplinary Proceedings"];
		if (sanctions == "Yes"){
			applyCondition = true;
		}
	}
	if (applyCondition) {
		if (!appHasCondition("Licensing General", "Applied", "Disciplinary Action Statement", null)){
			addStdCondition("Licensing General", "Disciplinary Action Statement");
		}
	}

	var noSSN = false;
	var capModel = getIncompleteCapId();

	var c = aa.people.getCapContactByCapID(capModel).getOutput();
	if (!c) logDebug("No contact found.");
	for (var i in c) {
		var con = c[i];
		var cm = con.getCapContactModel();
		var contactType = con.getPeople().getContactType();
		var SSN = con.getPeople().getSocialSecurityNumber();
		logDebug("contactType: " + contactType);
		logDebug("SSN: " + SSN);
		if (SSN == null){
			noSSN = true;
			logDebug("no SSN");
		}
		var fingerprintExpDate = getContactASI(cm, "Fingerprint Expiration Date");
		if (fingerprintExpDate != null){
			var fingerprintExpDateJS = convertDate(fingerprintExpDate);
			logDebug("fingerprint exp date: " + fingerprintExpDateJS);
		}
	} // people loop
	
// SSN Affidavit	
	if (noSSN){
		if (!appHasCondition("Licensing General", "Applied", "SSN Affidavit", null)){
			addStdCondition("Licensing General", "SSN Affidavit");
		}
	}

//Criminal Background Check
	var today = new Date();
	logDebug("today: " + today);
	
	if (fingerprintExpDate == null || fingerprintExpDateJS <= today){
		if (!appHasCondition("Licensing General", "Applied", "Criminal Background Check", null)){
			addStdCondition("Licensing General", "Criminal Background Check");
		}
	}
	
// CGFNS Certification Program and/or CGFNS Professional Report or NACES Evaluation and TOEFL-IBT

	var capID = getCapId();
	var capIDScript = aa.cap.createCapIDScriptModel(capID.getID1(), capID.getID2(), capID.getID3());
	logDebug("capIDScript: " + capIDScript); 
	var education = aa.education.getEducationList(capIDScript).getOutput();
	logDebug("education: " + education);
	logDebug("length: " + education.length);
	if(education.length > 0){
		for (i in education){
			var eduModel = education[i].getEducationModel();
			var eName = eduModel.getEducationName();
			logDebug("eName: " + eName);
			if (eName == "Registered Nurse - Foreign Education"){
				if (!appHasCondition("Nursing", "Applied", "CGFNS Certification Program", null)){
					addStdCondition("Nursing", "CGFNS Certification Program");
				}
			}
			if (eName == "Licensed Practical Nurse - Foreign Education"){
				if (!appHasCondition("Nursing", "Applied", "CGFNS Professional Report or NACES Evaluation", null)){
					addStdCondition("Nursing", "CGFNS Professional Report or NACES Evaluation");
				}
				if (!appHasCondition("Nursing", "Applied", "TOEFL-IBT", null)){
					addStdCondition("Nursing", "TOEFL-IBT");
				}
			}
		}
	}
// Verification of Licensure && Nursing School Transcript or Certification/Roster - only apply to the RN and LPN Applications
if (matches(appTypeArray[2],"Registered Nurse", "Licensed Practical Nurse")){
	if (AInfo["Obtained by"] == "Endorsement"){
		if (!appHasCondition("Licensing General", "Applied", "Verification of Licensure", null)){
			addStdCondition("Licensing General", "Verification of Licensure");
		}
	}else{  // == "Education"
		if (!appHasCondition("Nursing", "Applied", "Nursing School Transcript or Certification/Roster", null)){
			addStdCondition("Nursing", "Nursing School Transcript or Certification/Roster");
		}
	}
}

// Specialty Certification - only apply to RN Application
if (appTypeArray[2] == "Registered Nurse"){
	if (AInfo["Nurse Anesthetist"] == "CHECKED" || AInfo["Nurse Midwife"] == "CHECKED"
		|| AInfo["Nurse Practitioner"] == "CHECKED" || AInfo["Clinical Nurse Specialist"] == "CHECKED"){
			if (!appHasCondition("Nursing", "Applied", "Specialty Certification", null)){
				addStdCondition("Nursing", "Specialty Certification");
			}
		}
}

// Canadian Verification
if (AInfo["Temporary License for Canadian Licensees"] == "CHECKED"){
	if (!appHasCondition("Nursing", "Applied", "Canadian Verification", null)){
		addStdCondition("Nursing", "Canadian Verification");
	}
} 
	
} // Application or Relicensure record types


// For Rec types - RN Rnw, LPN Rnw, Nurse Specialty Rnw
 
if (appTypeArray[3] == "Renewal"){
	
//Conviction Information
	if (AInfo["Have you ever been convicted of a felony not previously reported"] == "Yes"
		|| AInfo["Have you ever been convicted of a misdemeanor not previously reported to the Department"] ==  "Yes"){
			if (!appHasCondition("Licensing General", "Applied", "Conviction Information", null)){
				addStdCondition("Licensing General", "Conviction Information");
			}
	}

//Disciplinary Action Explanation	
	if (AInfo["Have any sanctions been imposed against you not previously reported to the Department"] ==  "Yes"){
		if (!appHasCondition("Licensing General", "Applied", "Disciplinary Action Explanation", null)){
				addStdCondition("Licensing General", "Disciplinary Action Explanation");
		};
	}
} // Renewal record types


// functions
function getContactASI(cContact, asiName) {
	try {
		peopleModel = cContact.getPeople();
		peopleTemplate = peopleModel.getTemplate();
		if (peopleTemplate == null) return null;
		var templateGroups = peopleTemplate.getTemplateForms(); //ArrayList
		var gArray = new Array(); 
		if (!(templateGroups == null || templateGroups.size() == 0)) {
			thisGroup = templateGroups.get(0);
			var subGroups = templateGroups.get(0).getSubgroups();
			for (var subGroupIndex = 0; subGroupIndex < subGroups.size(); subGroupIndex++) {
				var subGroup = subGroups.get(subGroupIndex);
				var fArray = new Array();
				var fields = subGroup.getFields();
				for (var fieldIndex = 0; fieldIndex < fields.size(); fieldIndex++) {
					var field = fields.get(fieldIndex);
					fArray[field.getDisplayFieldName()] = field.getDefaultValue();
					if(field.getDisplayFieldName().toString().toUpperCase()==asiName.toString().toUpperCase()) {
						return field.getChecklistComment();
					}
				}
			}
		}
	}
	catch (err) { logDebug(err);}
	return null;
}
}


/**
    * Assesses fees to the Application Record based on Application Type
    * Business Rules are hard coded in the function, see source code for more information
	* @requires
	*	getIfVeteran()
	*	getRegisteredNurseSpecialty()
	*	updateFee()
    * @example
        assessApplicationFee();
    * @memberof INCLUDES_CUSTOM
    */
function assessApplicationFee() {
	var isVeteran = getIfVeteran();
	var feeAmountForCode = 0;

	switch ("" + appTypeString) {

		case 'Licenses/Nursing/Registered Nurse/Application':
			// Get the ASI informaiton and add it to the following variables
			var vRNSpecialtyArray = getRegisteredNurseSpecialty();
			var vRNSpecialtyCount = vRNSpecialtyArray.length;
			if (vRNSpecialtyCount > 0) {
				updateFee("4704-211", "RN APPLICATION", "FINAL", vRNSpecialtyCount, "Y", "N");
			}
			if (AInfo["Temporary License for Canadian Licensees"] == "CHECKED"){
				updateFee("4704-99", "RN APPLICATION", "FINAL",1, "Y", "N");
			}
			break;
		case 'Licenses/Nursing/Nurse Specialty/Application':
			// Get the ASI informaiton and add it to the following variables
			var vParentCapId = aa.cap.getCapID(AInfo['License Number']).getOutput();
			var vParentRNSpecialtyArray = getRegisteredNurseSpecialty("Active", vParentCapId);
			var vRNSpecialtyArray = getRegisteredNurseSpecialty();
			var vRNSpecialtyCount = vRNSpecialtyArray.length;
			if (vParentRNSpecialtyArray && vParentRNSpecialtyArray.length > 0) {
				vRNSpecialtyCount =  (vRNSpecialtyArray.length - vParentRNSpecialtyArray.length);
			}
			if (vRNSpecialtyCount > 0) {
				updateFee("4704-211", "APRN APPLICATION", "FINAL", vRNSpecialtyCount, "Y", "N");
			}
		case 'Licenses/Professional/Nursing/Reapplication':
			if (isVeteran)
				logDebug("Applicant is a veteran, do not assess a reapplication fee");
			else
				//updateFee('ELARAP01', 'ELAR_APPL', 'FINAL', 1, 'N');
				break;
		default:
			logDebug("Record type not scripted for application fee: " + appTypeString)
			break;
	}
}



/**
 * Find License and check expiration date. Fails if License could not be found.
 * Update expiration date. Confirm if applicant is a veteran. Confirm
 * specialties and update fees.
 *
 * @requires getParentLicenseCapID(CapIDModel) getIfVeteran(CapIDModel)
 *           getRegisteredNurseSpecialty() updateFee(fcode, fsched, fperiod,
 *           fqty, finvoice, pDuplicate, pFeeSeq)
 * @example assessRenewalAndLateFees();
 * @memberof ASA:LICENSES///APPLICATION
 */

function assessRenewalAndLateFees() {
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	var renewalLogic = "" + emseBiz.getScriptByPK(aa.getServiceProviderCode(), "LATE_FEE_FACTOR_DATA", "ADMIN").getScriptText();

	var difMonths = null
	var logic = JSON.parse(renewalLogic)
	var renewFactor = 1
	var lateFactor = 0

	if (typeof logic[appTypeString] != 'object') {
		logDebug("Record type: " + appTypeString + " does not have renewal/late fee config defined in system script: LATE_FEE_FACTOR_DATA")
		return
	}
	newLicId = getParentLicenseCapID(capId)
	if (!newLicId) {
		logDebug("WARNING: Could not find License to get Expiration Date.")
		return
	}

	thisLic = new licenseObject(newLicId.getCustomID(), newLicId)

	eDateString = thisLic.b1ExpDate
	tDateString = '6/22/2015' // for testing
	difMonths = null

	expDate = new Date(eDateString)
	today = new Date()
	today.setHours(0); today.setMinutes(0); today.setSeconds(0); today.setMilliseconds(0)
	//get configured inactive time period or if none, use a number larger than the current months past expiration
	var tmp = "0" + logic[appTypeString]["inactive"];
	nMonthsInactive = typeof logic[appTypeString]["inactive"] == 'number' ? Math.floor(parseFloat(tmp)) : (12 * 99); // if inactive, set nMonthsInactive to 99 years out * 12 months
	logDebug("Number of months inactive for this license type " + nMonthsInactive);

	for (i = 0; i < nMonthsInactive; i++) {
		dt = new Date(expDate)
		dt.setMonth(dt.getMonth() + i)
		if (dt.getDate() < expDate.getDate()) { dt.setDate(0); }
		if (dt >= today) { difMonths = i; break }
	}
	logDebug("Inactive: " + nMonthsInactive + " Diff: " + difMonths)
	if (difMonths == null) {
		logDebug("Record passed inactive date. Cannot add renewal fees")
		return
	}

	for (m = difMonths; m > 0; m--) {
		if (typeof logic[appTypeString][m.toString()] == 'object') {
			logDebug(difMonths + " Months Overdue: " + m)
			renewFactor = typeof logic[appTypeString][m.toString()]["renewFactor"] == 'number' ? parseInt("0" + logic[appTypeString][m.toString()]["renewFactor"]) : 0
			lateFactor = typeof logic[appTypeString][m.toString()]["lateFactor"] == 'number' ? parseInt("0" + logic[appTypeString][m.toString()]["lateFactor"]) : 0
			break;
		}
	}

	logDebug("renewFactor: " + renewFactor + " | lateFactor: " + lateFactor)

	var isVeteran = getIfVeteran(newLicId);
	logDebug("Contact is a veteran? " + isVeteran);

	// Add Appropriate fees
	switch ("" + appTypeString) {

		case 'Licenses/Nursing/Registered Nurse/Renewal':
			// Get the ASI informaiton and add it to the following variables
			var vRNSpecialtyArray = getRegisteredNurseSpecialty();
			var vRNSpecialtyCount = vRNSpecialtyArray.length;
			if (vRNSpecialtyCount > 0) {
				updateFee("4704-20", "RN RENEWAL", "FINAL", vRNSpecialtyCount, "Y", "N");
			}
			break;
		case 'Licenses/Nursing/Nurse Specialty/Renewal':
			// Get the ASI informaiton and add it to the following variables
			var vRNSpecialtyArray = getRegisteredNurseSpecialty();
			var vRNSpecialtyCount = vRNSpecialtyArray.length;
			if (vRNSpecialtyCount > 0) {
				updateFee("4704-20", "APRN RENEWAL", "FINAL", vRNSpecialtyCount, "Y", "N");
			}
			break;
		case 'Licenses/Boiler/Installer/Renewal':
			updateFee('BONLRE01', 'BONL_RENEW', 'FINAL', renewFactor, 'N') // Renewal Fee
			updateFee('BONLRE10', 'BONL_RENEW', 'FINAL', lateFactor, 'N') // Late Fee
			break

		default:
			logDebug("Record type does not have configured late fee scripting: " + appTypeString)
			break
	}
} 
/**
 * Determines the type of a License and updates the Transfer Fee based on the
 * year
 * 
 * @requires updateFee(fcode, fsched, fperiod, fqty, finvoice, pDuplicate,
 *           pFeeSeq)
 * @example assessTransferFeeAmount();
 * @memberof INCLUDES_CUSTOM
 */

function assessTransferFeeAmount() {
	// Introduced by Daniel M.
	var feeAmount;
	var currentYear = sysDate.getYear(); // Current year
	var startingYear2000 = 2000; // Year 2000 is the reference year

	if (String(appTypeString) == "Licenses/Electrical/Contractor/Transfer") {
		if ((currentYear - startingYear2000) % 3 == 0) {
			if (sysDate.getMonth() <= 8
				|| (sysDate.getMonth() == 9 && sysDate.getDayOfMonth() <= 30)) {
				feeAmount = 100;
			} else {
				feeAmount = 300;
			}
		}
		if ((currentYear - startingYear2000) % 3 == 1) {
			feeAmount = 300;
		}
		if ((currentYear - startingYear2000) % 3 == 2) {
			feeAmount = 200;
		}
		updateFee("ELCLT01", "ELCL_TRANS", "FINAL", feeAmount, "Y");
	} else if (String(appTypeString) == "Licenses/Electrical/Fire Alarm Contractor/Transfer") {
		if ((currentYear - startingYear2000) % 3 == 0) {
			if (sysDate.getMonth() <= 8
				|| (sysDate.getMonth() == 9 && sysDate.getDayOfMonth() <= 30)) {
				feeAmount = 100;
			} else {
				feeAmount = 300;
			}
		}
		if ((currentYear - startingYear2000) % 3 == 1) {
			feeAmount = 300;
		}
		if ((currentYear - startingYear2000) % 3 == 2) {
			feeAmount = 200;
		}
		updateFee("ELFCT01", "ELFC_TRANS", "FINAL", feeAmount, "Y");
	} else if (String(appTypeString) == "Licenses/Electrical/Facility Contractor/Transfer") {
		if ((currentYear - startingYear2000) % 3 == 0) {
			if (sysDate.getMonth() <= 8
				|| (sysDate.getMonth() == 9 && sysDate.getDayOfMonth() <= 30)) {
				feeAmount = 100;
			} else {
				feeAmount = 300;
			}
		}
		if ((currentYear - startingYear2000) % 3 == 1) {
			feeAmount = 300;
		}
		if ((currentYear - startingYear2000) % 3 == 2) {
			feeAmount = 200;
		}
		updateFee("ELFAT01", "ELFA_TRANS", "FINAL", feeAmount, "Y");
	} else if (String(appTypeString) == "Licenses/Electrical/Sign Contractor/Transfer") {
		if ((currentYear - startingYear2000) % 3 == 0) {
			if (sysDate.getMonth() <= 8
				|| (sysDate.getMonth() == 9 && sysDate.getDayOfMonth() <= 30)) {
				feeAmount = 67;
			} else {
				feeAmount = 200;
			}
		}
		if ((currentYear - startingYear2000) % 3 == 1) {
			feeAmount = 200;
		}
		if ((currentYear - startingYear2000) % 3 == 2) {
			feeAmount = 134;
		}
		updateFee("ELSCT01", "ELSC_TRANS", "FINAL", feeAmount, "Y");
	} else if (String(appTypeString) == "Licenses/Electrical/Journey/Transfer") {
		feeAmount = 40;
		updateFee("ELJLT01", "ELJL_TRANS", "FINAL", feeAmount, "Y");
	} else if (String(appTypeString) == "Licenses/Electrical/Master/Transfer") {
		feeAmount = 50;
		updateFee("ELML01", "ELML_TRANS", "FINAL", feeAmount, "Y");
	} else if (String(appTypeString) == "Licenses/Electrical/Sign Specialist/Transfer") {
		feeAmount = 40;
		updateFee("ELSS_TRANS", "ELSS_TRANS", "FINAL", feeAmount, "Y");
	} else if (String(appTypeString) == "Licenses/Electrical/Fire Alarm Specialty Tech/Transfer") {
		feeAmount = 50;
		updateFee("FASTT01", "FAST_TRANS", "FINAL", feeAmount, "Y");
	}

	logDebug("Fee Amount: " + feeAmount);
}
/**
 * Confirm the License type and updates the task department it belongs to
 * 
 * @requires appMatch(ats) updateTaskDepartment(wfstr, wfDepartment)
 * @example assignLicenseNumberToDepartment(licenseNumber);
 * @memberof INCLUDES_CUSTOM
 */


function assignLicenseNumberToDepartment(licenseNumber) {
	//Introduced by Daniel M.
	licCapId = aa.cap.getCapID(licenseNumber).getOutput();
	logDebug(licCapId);

	if (appMatch("Licenses/Boiler/*/License", licCapId)) {
		updateTaskDepartment("Amendment Approval", "LARA/BOILER/NA/NA/NA/NA/CLERK");
	}
	if (appMatch("Licenses/Electrical/*/License", licCapId)) {
		updateTaskDepartment("Amendment Approval", "LARA/ELEC/NA/NA/NA/NA/CLERK");
	}
	if (appMatch("Licenses/Elevator/*/License", licCapId)) {
		updateTaskDepartment("Amendment Approval", "LARA/ELEVATOR/NA/NA/NA/NA/CLERK");
	}
	if (appMatch("Licenses/Manufactured Home/*/License", licCapId)) {
		updateTaskDepartment("Amendment Approval", "LARA/MH/NA/NA/NA/NA/CLERK");
	}
	if (appMatch("Licenses/Mechanical/*/License", licCapId)) {
		updateTaskDepartment("Amendment Approval", "LARA/MECH/NA/NA/NA/NA/CLERK");
	}
	if (appMatch("Licenses/Plumbing/*/License", licCapId)) {
		updateTaskDepartment("Amendment Approval", "LARA/PLUMBING/NA/NA/NA/NA/CLERK");
	}
}

/**
 * Retrieves parent License and gets contractor number Checks if valid and
 * begins the renewal process
 * 
 * @requires getParentCapID4Renewal() getParentLicenseCapID(itemCap)
 *           getAppSpecific(itemName) getApplication(appNum) createCap(pCapType,
 *           pAppName) closeTask(wfstr,wfstat,wfcomment,wfnote)
 *           branch(stdChoice)
 * @example autoContractorRenewal();
 * @memberof INCLUDES_CUSTOM
 */

function autoContractorRenewal() {
	logDebug("within 1");
	logDebug("capId: " + capId);
	// parentCapId = getParentCapID4Renewal(capId);
	getParentCapID4Renewal(capId);

	var parentLic = getParentLicenseCapID(capId); // getMatchingParent(appGroup,
	// appType, appSubtype,
	// appCategory);
	pLicArray = String(parentLic).split("-");
	var parentLicenseCAPID = aa.cap.getCapID(pLicArray[0], pLicArray[1],
		pLicArray[2]).getOutput();
	logDebug("parentLicenseCAPID:" + parentLicenseCAPID);

	var contractorLicNum = getAppSpecific("Plumbing Contractor License Number",
		parentLicenseCAPID);
	if (!matches(contractorLicNum, null, "", undefined)) {
		var contractorCapId = getApplication(contractorLicNum);
		if (isValidContractorLicense("Licenses/Plumbing/Contractor/License",
			contractorCapId)) {
			renewCapId = createCap("Licenses/Plumbing/Contractor/Renewal", "")
			recId = String(contractorCapId).split("-");
			licenseId = aa.cap.getCapID(recId[0], recId[1], recId[2])
				.getOutput();
			renewLinkResult = aa.cap.createRenewalCap(licenseId, renewCapId,
				false);
			holdId = capId;
			q
			capId = renewCapId;
			closeTask("Renewal Status", "Renewal Issued",
				"Renewed via Master Plumber Lic #"
				+ parentLicenseCAPID.getCustomID(), "");
			processRenewalPayment();
			branch("EMSE:LicProfLookup");
			capId = holdId;
		}
	}

}

// 128-129 end


function calcExpDate18Months(thislic, licId){
	var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
	var relcap = aa.cap.getCap(licId).getOutput();
	var licIssuedDate = relcap.getFileDate();
	var currentYear = sysDate.getYear();
	var newExpDate;
	
	if (licIssuedDate != null) {
		var licIssuedDateString = licIssuedDate.getMonth() + "/"
			+ licIssuedDate.getDayOfMonth() + "/"
			+ licIssuedDate.getYear();
		logDebug("licIssuedDateString: " + licIssuedDateString);
		// Figure out the number of years between this year and the issuance
		// year.
		var diffYear = currentYear - licIssuedDate.getYear();
		logDebug("diffYear: " + diffYear);

		// Temp date of when lic was issued with current year to compare to
		// the system date
		var tempDate = licIssuedDate.getMonth() + "/"
			+ licIssuedDate.getDayOfMonth() + "/" + currentYear;
		var tempDateNew = new Date(tempDate);

		// System date
		var systemDateNew = new Date();

		// Get date object of when lic was issued
		var licIssuedDateNew = new Date(licIssuedDateString);

		var diffDays = Math.round(Math
			.abs((tempDateNew.getTime() - systemDateNew.getTime())
			/ (oneDay)));
		logDebug("diffDays: " + diffDays);

		// License expired already
		if (tempDateNew < systemDateNew) {
			newExpDate = dateAddMonths(licIssuedDateNew,
				18 * (diffYear + 1));
		}
		// Renewing early or Dates on different years
		else {
			// Renewing early
			if (diffDays <= 90) {
				newExpDate = dateAddMonths(licIssuedDateNew,
					18 * (diffYear + 1));
			}
			// License expired, renewing from previous year
			else {
				newExpDate = dateAddMonths(licIssuedDateNew,
					18 * (diffYear));
			}
		}
	}
	return newExpDate;
}
/**
 * Unified expiration date calculation for license issuance and renewals.
 * 
 * @requires jsDateToMMDDYYYY(pJavaScriptDate) dateAddMonths(pDate, pMonths)
 *           dateAdd(td, amt)
 * 
 * @example calcExpirationDate(CapIDModel, CapIDModel)
 * 
 * @memberof INCLUDES_CUSTOM
 * 
 * @param {CapIDModel}
 *            thislic The license object for the license getting an expiration
 *            date.
 * 
 * @param {CapIDModel}
 *            licId The license id of the license
 * 
 * @return The expiration date of the license.
 * 
 * @note This function does not actually set the expiration date. Setting the
 *       expiration to the license is to be performed by the caller if desired.
 */

function calcExpirationDate(thislic, licId) {
	var startingYear2000 = 2000;
	var newExpDate;
	var currentYear = sysDate.getYear();
	var licIssuedDate = getFirstIssuedDate(licId);
	logDebug("Renewal Code is " + thislic.getCode());
	switch (String(thislic.getCode())) {
		case "ANNUAL":
			if (sysDate.getMonth() < 10) {
				newExpDate = "12/31/" + currentYear;
			} else {
				newExpDate = "12/31/" + (1 + currentYear);
			}
			break;
		case "2 YR ISSUE":
			var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

			if (licIssuedDate != null) {
				var licIssuedDateString = jsDateToMMDDYYYY(licIssuedDate);
				// licIssuedDate.getMonth() +"/"+ licIssuedDate.getDayOfMonth()
				// +"/"+ licIssuedDate.getYear();
				//
				logDebug("licIssuedDateString: " + licIssuedDateString);
				// Figure out the number of years between this year and the issuance
				// year.
				var diffYear = currentYear - licIssuedDate.getFullYear();
				logDebug("diffYear: " + diffYear);

				// Temp date of when lic was issued with current year to compare to
				// the system date
				var tempDate = licIssuedDateString;
				var tempDateNew = new Date(tempDate);

				// System date
				var systemDateNew = new Date();

				// Get date object of when lic was issued
				var licIssuedDateNew = new Date(licIssuedDateString);

				if (diffYear <= 1) {
					newExpDate = dateAddMonths(licIssuedDateNew,
						12 * (diffYear + 1));
				}
				// License expired already
				else if (tempDateNew < systemDateNew) {
					newExpDate = dateAddMonths(licIssuedDateNew,
						12 * (diffYear + 2));
				}
			}
			break;
		case "1 YR ISSUE":
			var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

			var relcap = aa.cap.getCap(licId).getOutput();
			var licIssuedDate = relcap.getFileDate();

			if (licIssuedDate != null) {
				var licIssuedDateString = licIssuedDate.getMonth() + "/"
					+ licIssuedDate.getDayOfMonth() + "/"
					+ licIssuedDate.getYear();
				logDebug("licIssuedDateString: " + licIssuedDateString);
				// Figure out the number of years between this year and the issuance
				// year.
				var diffYear = currentYear - licIssuedDate.getYear();
				logDebug("diffYear: " + diffYear);

				// Temp date of when lic was issued with current year to compare to
				// the system date
				var tempDate = licIssuedDate.getMonth() + "/"
					+ licIssuedDate.getDayOfMonth() + "/" + currentYear;
				var tempDateNew = new Date(tempDate);

				// System date
				var systemDateNew = new Date();

				// Get date object of when lic was issued
				var licIssuedDateNew = new Date(licIssuedDateString);

				var diffDays = Math.round(Math
					.abs((tempDateNew.getTime() - systemDateNew.getTime())
					/ (oneDay)));
				logDebug("diffDays: " + diffDays);

				// License expired already
				if (tempDateNew < systemDateNew) {
					newExpDate = dateAddMonths(licIssuedDateNew,
						12 * (diffYear + 1));
				}
				// Renewing early or Dates on different years
				else {
					// Renewing early
					if (diffDays <= 90) {
						newExpDate = dateAddMonths(licIssuedDateNew,
							12 * (diffYear + 1));
					}
					// License expired, renewing from previous year
					else {
						newExpDate = dateAddMonths(licIssuedDateNew,
							12 * (diffYear));
					}
				}
			}
			break;
		case "DEC 31 ANNUAL":
			if (sysDate.getMonth() < 10) {
				newExpDate = "12/31/" + currentYear;
			} else {
				newExpDate = "12/31/" + (1 + currentYear);
			}
			break;
		case "DEC 31 THREE YEAR":
			// Make an inner switch statement to reduce mathematical and comparison
			// operations.
			switch ((currentYear - startingYear2000) % 3) {
				case 0:
					// Do a full cycle renewal if near the end of the renewal cycle.
					// Otherwise, renew for this cycle.
					if (sysDate.getMonth() <= 9) {
						newExpDate = "12/31/" + currentYear;
					} else {
						newExpDate = "12/31/" + (3 + currentYear);
					}
					break;
				case 1:
					newExpDate = "12/31/" + (2 + currentYear);
					break;
				case 2:
					newExpDate = "12/31/" + (1 + currentYear);
					break;
			}
			break;
		case "AUG 31 ANNUAL":
			if (sysDate.getMonth() < 6) {
				newExpDate = "08/31/" + currentYear;
			} else {
				newExpDate = "08/31/" + (1 + currentYear);
			}
			break;
		case "AUG 31 THREE YEAR":
			switch ((currentYear - startingYear2000) % 3) {
				case 0:
					newExpDate = "8/31/" + (1 + currentYear);
					break;
				case 1:
					if (sysDate.getMonth() < 6) {
						newExpDate = "8/31/" + currentYear;
					} else {
						newExpDate = "8/31/" + (3 + currentYear);
					}
					break;
				case 2:
					newExpDate = "8/31/" + (2 + currentYear);
					break;
			}
			break;
		case "SEPT 16 THREE YEAR":
			switch ((currentYear - startingYear2000) % 3) {
				case 0:
					// Only call the function once to save CPU cycles.
					var month = sysDate.getMonth();
					if (month <= 5 || (month == 6 && sysDate.getDayOfMonth() < 16)) {
						newExpDate = "9/16/" + (currentYear);
					} else {
						newExpDate = "9/16/" + (3 + currentYear);
					}
					break;
				case 1:
					newExpDate = "9/16/" + (2 + currentYear);
					break;
				case 2:
					newExpDate = "9/16/" + (1 + currentYear);
					break;
			}
			break;
		case "APR 30 ANNUAL":
			/*
			 * Refactored to use fewer comparisons if (sysDate.getMonth() >= 5){
			 * newExpDate = "04/30/" + (1 + currentYear); } else if
			 * (sysDate.getMonth() == 1){ newExpDate = "04/30/" + currentYear; }
			 * else { newExpDate = "04/30/" + (1 + currentYear); }
			 */
			if (sysDate.getMonth() == 1) {
				newExpDate = "04/30/" + currentYear;
			} else {
				newExpDate = "04/30/" + (1 + currentYear);
			}
			break;
		case "APR 30 THREE YEAR":
			switch ((currentYear - startingYear2000) % 3) {
				case 0:
					newExpDate = "4/30/" + (1 + currentYear);
					break;
				case 1:
					if (sysDate.getMonth() < 2) {
						newExpDate = "4/30/" + currentYear;
					} else {
						newExpDate = "4/30/" + (3 + currentYear);
					}
					break;
				case 2:
					newExpDate = "4/30/" + (2 + currentYear);
					break;
			}
			break;
		case "OCT 1 THREE YEAR":
			switch ((currentYear - startingYear2000) % 3) {
				case 0:
					if (sysDate.getMonth() <= 7) {
						newExpDate = "10/01/" + currentYear;
					} else {
						newExpDate = "10/01/" + (3 + currentYear);
					}
					break;
				case 1:
					newExpDate = "10/01/" + (2 + currentYear);
					break;
				case 2:
					newExpDate = "10/01/" + (1 + currentYear);
					break;
			}
			break;
		default:
			currExpDate = thislic.b1ExpDate;
			currExpJSDate = new Date(currExpDate);
			if (currExpJSDate < new Date()) {
				var expUnit = thislic.b1Exp.getExpUnit();
				var expInterval = thislic.b1Exp.getExpInterval();

				// expUnit is never changed, so these are mutually exclusive.
				if (expUnit == "DAYS") {
					newExpDate = dateAdd(currExpDate, expInterval);
				} else if (expUnit == "MONTHS") {
					newExpDate = dateAddMonths(currExpDate, expInterval);
				} else if (expUnit == "YEARS") {
					newExpDate = dateAddMonths(currExpDate, expInterval * 12);
				}
			}
	}
	logDebug("(calcExpirationDate) The new expiration date is " + newExpDate);
	return newExpDate;
}
/**
 * Confirms type of License and calculates the additional fees
 * 
 * @requires appMatch(ats)
 * @example calcLicFees(Integer, FeeItemModel);
 * @memberof INCLUDES_CUSTOM
 * @param {Integer}
 *            sites
 * @param {FeeItemModel}
 *            feeItem
 * @returns {Integer} Returns the total value of the License after the
 *          additional Sites fees
 */

function calcLicFee(sites, feeItem) {

	if (appMatch("Licenses/Manufactured Home/Community/Application")) {
		if (feeItem == "MHCLAP01") {
			var baseFee = 225;
			var siteFee = 3;
		} else if (feeItem == "MHCLAP02") {
			var baseFee = 150;
			var siteFee = 2;
		} else {
			var baseFee = 75;
			var siteFee = 1;
		}
	}

	if (appMatch("Licenses/Manufactured Home/Community/Reapplication")) {
		if (feeItem == "MHCLAP04") {
			var baseFee = 120;
			var siteFee = 3;
		} else if (feeItem == "MHCLAP05") {
			var baseFee = 80;
			var siteFee = 2;
		} else {
			var baseFee = 40;
			var siteFee = 1;
		}
	}
	if (sites <= 25)
		return baseFee;

	if (sites > 25) {
		var additionalSites = (sites - 25);
		var additionalSitesValue = ((additionalSites * siteFee) + baseFee);

		return additionalSitesValue;
	}
}

// The two functions below are being used to get the related records and their
// statuses before issuing C of O on a building permit

/**
 * Retrieves applicant and assigns them as a License holder
 * 
 * @example changeApplicantToLicenseHolder(CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            licCapId
 */

function changeApplicantToLicenseHolder(licCapId) {

	var conToChange = null;
	consResult = aa.people.getCapContactByCapID(licCapId);
	if (consResult.getSuccess()) {
		cons = consResult.getOutput();
		for (thisCon in cons) {
			if (cons[thisCon].getCapContactModel().getPeople().getContactType() == "Applicant") {
				conToChange = cons[thisCon].getCapContactModel();
				p = conToChange.getPeople();
				contactAddressListResult = aa.address
						.getContactAddressListByCapContact(conToChange);
				if (contactAddressListResult.getSuccess())
					contactAddressList = contactAddressListResult.getOutput();
				convertedContactAddressList = convertContactAddressModelArr(contactAddressList);
				p.setContactType("License Holder");
				p.setContactAddressList(convertedContactAddressList);
				conToChange.setPeople(p);
				conToChange.setPrimaryFlag("Y");
				aa.people.editCapContactWithAttribute(conToChange);
			}
		}
	}
}

function checkFees(){
		
if (matches(wfTask, 'Application Review', 'Renewal Review', 'Relicensure Review', 'Reinstatement Review')
	&& matches(wfStatus, 'Application Review Complete', 'Renewal Review Complete', 'Relicensure Review Complete', 'Reinstatement Review Complete')){
	
	var notInvoiced;
	var feeItemList = aa.finance.getFeeItemByCapID(capId).getOutput();
	for (x in feeItemList){
		var feeItem = feeItemList[x];
		if (!matches(feeItem.getFeeitemStatus(),"INVOICED", "VOIDED", "CREDITED")){
			notInvoiced = true;
		}
	}
	if (notInvoiced){
		showMessage = true;
		cancel = true;
		comment('There is a pending fee that has not been Invoiced.');
	}	

	if(balanceDue > 0) {
		showMessage = true;
		cancel = true;
		comment('Review cannot be completed with a balance greater than zero.');
	}
} // task,status
} // function
/**
 * Confirm if License has an insurance carrier
 * 
 * @example checkForInsurCarrier(CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            myCapId
 */

function checkForInsurCarrier(myCapId) {

	var licensedContractor = false;
	var capLicenseResult = aa.licenseScript.getLicenseProf(myCapId);
	logDebug("Inside checkForInsurCarrier");
	comment("INSIDE checkForInsurCarrier2");
	if (capLicenseResult.getSuccess()) {

		var refLicArr = capLicenseResult.getOutput();

		for (x in refLicArr) {
			logDebug(refLicArr[x]);
			var type = refLicArr[x].getLicenseType();
			logDebug("Type is:" + type);

			if (type == ("Mechanical Contractor")
				|| type == ("Plumbing Contractor")
				|| type == ("Electrical Contractor")) {

				var num = refLicArr[x].getLicenseNbr();
				logDebug("Lic Num:" + num);

				var myCapId = capIDString;
				var capId = aa.cap.getCapID(num).getOutput();
				b1ExpResult = aa.expiration.getLicensesByCapID(capId);
				var b1Exp = b1ExpResult.getOutput();
				var expDate = b1Exp.getExpDate();

				var month = expDate.getMonth();
				var day = expDate.getDayOfMonth();
				var year = expDate.getYear();
				var expirationDate = (month + "/" + day + "/" + year);
				var expirDate = new Date(expirationDate);

				logDebug("Expiration Date is:" + month + "/" + day + "/" + year);

				var tDate = new Date();
				var tMonth = tDate.getMonth();
				var tDay = tDate.getDate();
				var tYear = tDate.getFullYear();
				var today = (tMonth + "/" + tDay + "/" + tYear);

				var currDate = new Date(today);

				if (currDate > expirDate) {
					logDebug("Past Expiration Date, Contractor License is past due/expired");
				} else if (currDate < expirDate) {
					logDebug("Valid Contractor License");
					logDebug("Todays Date is" + tDate);
					logDebug("Expiration Date is" + expDate);
					licensedContractor = true;
				}

			}
		}
		logDebug(AInfo['Type of Job']);
		logDebug("Workers Comp Insurance Carrier Value is:"
			+ AInfo['Workers Comp Insurance Carrier (or reason for exemption)']);

		if (AInfo['Type of Job'] == "Single Family" && licensedContractor) {

			if (AInfo['Workers Comp Insurance Carrier (or reason for exemption)'] == null) {
				showMessage = true;
				cancel = true;
				comment("You must enter a value for Workers Comp Insurance Carrier");

			}

			if (AInfo['UIA Number (or reason for exemption)'] == null) {
				showMessage = true;
				cancel = true;
				comment("You must enter a value for UIA Number");

			}

		}

	}

}

/**
 * Confirm if License has an insurance carrier for submission
 * 
 * @example checkForInsurCarrierOnSubmit(CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            myCapId
 */


function checkForInsurCarrierOnSubmit(myCapId) {

	// AInfo["Workers Comp Insurance Carrier (or reason for exemption)"];
	var uia = AInfo['UIA Number (or reason for exemption)'];

	showMessage = true;
	cancel = true;
	comment("Values are" + work + "" + uia);

	if (work == null) {
		showMessage = true;
		cancel = true;
		comment("You must enter a value for Workers Comp Insurance Carrier");
	}

	if (AInfo["Workers Comp Insurance Carrier (or reason for exemption)"] == null) {
		showMessage = true;
		cancel = true;
		comment("You must enter a value for Workers Comp Insurance Carrier");

	}

	if (AInfo['UIA Number (or reason for exemption)'] == null) {
		showMessage = true;
		cancel = true;
		comment("You must enter a value for UIA Number");

	}

}

/**
 * Checks that License fee items are paid in full
 * 
 * @example checkFullPaying(CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            capid
 */

function checkFullPaying(capid) {
	var checkResult = aa.fee.isFullPaid4Renewal(capid);
	if (!checkResult.getSuccess()) {
		logDebug("ERROR: Failed to check full paying, renewal CAP(" + capid
			+ "). " + result.getErrorMessage());
		return false;
	}
	var fullPaid = checkResult.getOutput();
	if (fullPaid == "false") {
		logDebug("The fee items is not full paid, please pay and apply the Fee items in the renewal CAP "
			+ capid);
	}
	return "true";
}

function checkGoodMoralCharacter() {

	var vConvictedOfFelony = AInfo["Have you ever been convicted of a felony not previously reported"];
	var vConvictedOfMisdemeanor = AInfo["Have you ever been convicted of a misdemeanor not previously reported to the Department"];
	if (matches(vConvictedOfFelony, "Y", "Yes") || matches(vConvictedOfMisdemeanor, "Y", "Yes")) {
		return false;
	}
	else {
		return true;
	}

}
/**
 * Retrieves a list of all Law Examinations and confirms if they have passed or
 * failed
 * 
 * @example checkForInsurCarrier(CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @returns {boolean} Indicates whether a Law Exam was passed or failed (true or
 *          false)
 */

function checkIfLawExamPassedOrFailed() {

	var itemCap = capId;
	var id1 = itemCap.ID1;
	var id2 = itemCap.ID2;
	var id3 = itemCap.ID3;
	var lawPassed = false;

	var capIDScriptModel = aa.cap.createCapIDScriptModel(id1, id2, id3);

	examListResult = aa.examination.getExaminationList(capIDScriptModel);

	if (examListResult.getSuccess()) {
		examList = examListResult.getOutput();

		for (el in examList) {
			thisExam = examList[el].getExaminationModel();

			examName = examList[el].getExamName();

			if (examName.toUpperCase() == "LAW") {
				examScore = examList[el].getFinalScore()
				if (examScore >= 70) {
					lawPassed = true;
				}
			}
		}
		return lawPassed;
	}
}

function checkPlanReviewConditions() {

    var pDesc = "Pending BCC Plan Review";

    var condResult = aa.capCondition.getCapConditions(capId, "Building Holds");

    if (condResult.getSuccess())
        var capConds = condResult.getOutput();
    else {
        logMessage("**ERROR: getting cap conditions: " + condResult.getErrorMessage());
        logDebug("**ERROR: getting cap conditions: " + condResult.getErrorMessage());
    }

    var cDesc;

    for (cc in capConds) {
        var thisCond = capConds[cc];
        var cDesc = thisCond.getConditionDescription();

        //Look for matching condition

        if (pDesc.toUpperCase().equals(cDesc.toUpperCase())) {
            showMessage = true;
            cancel = true;
            comment("Cannot issue this permit with a Pending Plan Review Application");
        }
    }
}



/**
 * Retrieves the names of all Exams that were passed
 * 
 * @example checkWhichExamsPassed();
 * @memberof INCLUDES_CUSTOM
 * @returns {string[]} Contains the names of all passed Exams
 */

function checkWhichExamsPassed() {
	var itemCap = capId;
	var id1 = itemCap.ID1;
	var id2 = itemCap.ID2;
	var id3 = itemCap.ID3;
	var examsPassedArray = [];
	var capIDScriptModel = aa.cap.createCapIDScriptModel(id1, id2, id3);
	examListResult = aa.examination.getExaminationList(capIDScriptModel);

	if (examListResult.getSuccess()) {
		examList = examListResult.getOutput();
		for (el in examList) {
			logDebug(examList[el].getExaminationModel().getExamStatus());
			if (examList[el].getExaminationModel().getExamStatus() == "PCOMPLETED") {
				examName = examList[el].getExamName();
				examScore = examList[el].getExaminationModel().getFinalScore()
				if (examScore != null) {
					if (examScore >= 70) {
						examsPassedArray.push(examName);
					}
				}
			}
		}
	}
	return examsPassedArray;
}

/**
 * Receives exam name and status, checks that it is a General License and is
 * awaiting approval, then grants the exam work classification
 * 
 * @requires loadASITable(tname)
 * @example checkWorkClassificationsExamApproval(String, String);
 * @memberof INCLUDES_CUSTOM
 * @param {String}
 *            wcExamName
 * @param {String}
 *            wcExamStatus
 * @returns {string[]} Contains the names of all passed Exams
 */

function checkWorkClassificationsExamApproval(wcExamName, wcExamStatus) {
	var workClassifications = false;
	tblWorkClassifications = loadASITable("WORK CLASSIFICATIONS");
	if (typeof (tblWorkClassifications) != "object") {
		workClassifications = false;
		logDebug("WARNING: Work Classifications Table Not Found");
	} else {
		for (xy in tblWorkClassifications) {
			if (tblWorkClassifications[xy]["General License"] == wcExamName
				&& tblWorkClassifications[xy]["Pending/Approval"] == wcExamStatus) {
				workClassifications = true;
			}
		}
	}
	logDebug("workClassifications = " + workClassifications);
	return workClassifications;
}

/**
 * Receives a list of Contacts and removes the ones containing the name of the
 * component
 * 
 * @example clearContactData(String);
 * @memberof INCLUDES_CUSTOM
 * @param {String}
 *            dailyComponentName
 */

function clearContactData(dailyComponentName) {
	var contactList = capModel.getContactsGroup();
	if (contactList != null && contactList.size() > 0) {
		for (var i = contactList.size(); i > 0; i--) {
			var contactModel = contactList.get(i - 1);
			if (contactModel.getComponentName() != null
				&& contactModel.getComponentName().indexOf(
					dailyComponentName) == 0) {
				contactList.remove(contactModel);
			}
		}
	}
}

/**
 * Receives name of component and searches through Licenses, Contacts, and
 * Applicants for that component, then removes them
 * 
 * @requires clearContactData(String) clearLPData(String)
 * @example clearDataByComponentName(String, String);
 * @memberof INCLUDES_CUSTOM
 * @param {String}
 *            componentSeqNbr
 * @param {String}
 *            componentName
 */

function clearDataByComponentName(componentSeqNbr, componentName) {
	var componentAliasName = getComponentAliasName(componentName);
	if (componentAliasName != null) {
		var dailyComponentName = componentAliasName + "_" + componentSeqNbr;
		if (componentAliasName.indexOf("MultiLicenses") == 0
			|| componentAliasName.indexOf("License") == 0) {
			clearLPData(dailyComponentName);
		} else if (componentAliasName.indexOf("MultiContacts") == 0
			|| componentAliasName.indexOf("Contact1") == 0
			|| componentAliasName.indexOf("Contact2") == 0
			|| componentAliasName.indexOf("Contact3") == 0
			|| componentAliasName.indexOf("Applicant") == 0) {
			clearContactData(dailyComponentName);
		}
	}
}

/**
 * Receives a list of License Professionals and removes those with a matching
 * Component Name
 * 
 * @example clearLPData(String);
 * @memberof INCLUDES_CUSTOM
 * @param {String}
 *            dailyComponentName
 */

function clearLPData(dailyComponentName) {
	var lpList = capModel.getLicenseProfessionalList();
	if (lpList != null && lpList.size() > 0) {
		for (var i = lpList.size(); i > 0; i--) {
			var lpModel = lpList.get(i - 1);
			if (lpModel.getComponentName() != null
				&& lpModel.getComponentName().indexOf(dailyComponentName) == 0) {
				lpList.remove(lpModel);
			}
		}
	}

	var licenseProfessionalModel = capModel.getLicenseProfessionalModel();
	if (licenseProfessionalModel != null) {
		if (licenseProfessionalModel.getComponentName() != null
			&& licenseProfessionalModel.getComponentName().indexOf(
				dailyComponentName) == 0) {
			capModel.setLicenseProfessionalModel(null);
		}
	}
}

/**
 * Receives a list of Page Components from a Page and hides the Page if they
 * have a matching Component Name
 * 
 * @requires getPageComponents(CapIDModel, Integer, Integer)
 *           clearDataByComponentName(String, String)
 * @example clearPageSectionData(Integer, Integer);
 * @memberof INCLUDES_CUSTOM
 * @param {Integer}
 *            stepIndex
 * @param {Integer}
 *            pageIndex
 */

function clearPageSectionData(stepIndex, pageIndex) {
	var capID = capModel.getCapID();

	var pageComponents = getPageComponents(capID, stepIndex, pageIndex);

	if (pageComponents != null && pageComponents.length > 0) {
		for (var i = 0; i < pageComponents.length; i++) {
			clearDataByComponentName(pageComponents[i].getComponentSeqNbr(),
				pageComponents[i].getComponentName());
		}

		aa.acaPageFlow.hideCapPage4ACA(capID, stepIndex, pageIndex);
	}
}

/**
 * Clears the data of a Parcel if it contains a given Component Name
 * 
 * @requires getPageComponents(CapIDModel, Integer, Integer)
 *           clearDataByComponentName(String, String)
 * @example clearParcelData(String);
 * @memberof INCLUDES_CUSTOM
 * @param {String}
 *            dailyComponentName
 */

function clearParcelData(dailyComponentName) {
	var parcel = capModel.getParcelModel();
	if (parcel.getComponentName() != null
		&& parcel.getComponentName().indexOf(dailyComponentName) == 0) {
		capModel.setParcelModel(null);
	}
}

/**
 * Receives list of parent Building Records and removes cap conditions
 * 
 * @requires removeCapCondition(cType,cDesc)
 * @example clearPlanReviewCondition();
 * @memberof INCLUDES_CUSTOM
 */

function clearPlanReviewCondition() {

	var parentRecords = getParents("Building/Building/NA/NA");

	if (parentRecords.length > 0) {
		for (x in parentRecords) {
			var thisParent = parentRecords[x];
			logDebug("parentCap: " + thisParent);
			removeCapCondition("Building Holds", "Pending BCC Plan Review",
					thisParent);
		}
	}
}

/**
 * Closes all Workflow tasks, DOES NOT handleDisposition
 * 
 * @example clearDataByComponentName();
 * @memberof INCLUDES_CUSTOM
 * @param {String}
 *            [itemCap]
 */

function closeWorkflow() { // optional capId

	var itemCap = capId;
	if (arguments.length > 0)
		itemCap = arguments[0];

	// closes all tasks of a workflow. DOES NOT handleDisposition.
	var taskArray = new Array();

	var workflowResult = aa.workflow.getTasks(itemCap);
	if (workflowResult.getSuccess())
		var wfObj = workflowResult.getOutput();
	else {
		logMessage("**ERROR: Failed to get workflow object: "
			+ workflowResult.getErrorMessage());
		return false;
	}

	var fTask;
	var stepnumber;
	var wftask;

	for (i in wfObj) {
		fTask = wfObj[i];
		wftask = fTask.getTaskDescription();
		stepnumber = fTask.getStepNumber();
		completeFlag = fTask.getCompleteFlag();
		aa.workflow.adjustTask(itemCap, stepnumber, "N", completeFlag, null,
			null);
		logMessage("Closing Workflow Task " + wftask);
		logDebug("Closing Workflow Task " + wftask);
	}
}


function closeWorkflowIssueLicense(){
// if (currentUserID == "ADMIN") showDebug = 3;
var vWFComment = "Updated via EMSE Script";
try{
	if (wfProcess == "LIC_NURSING_APPLICATION") {
		logDebug("wfProcess in closeWorkflowIssueLicense function: " + wfProcess);
		
		/* moving this section to function denyApplication to cover all record types
		if (wfTask == "Background Review" && wfStatus == "Denied"){
			updateTask("Application Status", "Denied", vWFComment, "");
			updateAppStatus("Application Denied", vWFComment);
			if(isTaskActive("Application Review")){
				deactivateTask("Application Review");
			}
			if(isTaskActive("Examination Status")){
				deactivateTask("Examination Status");
			}	
		 }  */
		
		 // var workflowTasks = loadTasks(capId);
		 // capModel = getIncompleteCapId();
		 var thisCapModel = getIncompleteCapId();
		 var wfTasks = aa.workflow.getTasks(capId);
		 
		if (wfTasks.getSuccess){
			var workflowTasks = wfTasks.getOutput();
	
			var BR = false;
			var ES = false;
			var AR = false;
			var tempStatus = false;
			
			for (i in workflowTasks) {
				var fTaskDes = workflowTasks[i].getTaskDescription();
				var fTaskStatus = workflowTasks[i].getDisposition(); 
				
				logDebug("ftaskDes: " + fTaskDes);
				logDebug("ftaskStat: " + fTaskStatus);
			
				if (fTaskDes == "Background Review" && (fTaskStatus == "Completed" || fTaskStatus == "Not Applicable")){
					BR = true;
					// logDebug("ftaskDes: " + fTaskDes);
					// logDebug("ftaskStat: " + fTaskStatus);
				}
				if (fTaskDes == "Examination Status"){
					if (fTaskStatus == "Passed" || fTaskStatus == "Not Applicable"){
						ES = true;
						// logDebug("ftaskDes: " + fTaskDes);
						//	logDebug("ftaskStat: " + fTaskStatus);
					}
					if (fTaskStatus == "Eligible"){
						tempStatus = true;
					}
				}
				if (fTaskDes == "Application Review" && fTaskStatus == "Application Review Complete"){
					AR = true;
					// logDebug("ftaskDes: " + fTaskDes);
					// logDebug("ftaskStat: " + fTaskStatus);
				}
				
			} // for loop
			
		 } // tasks success		 
		 	logDebug("BR: " + BR);
			logDebug("ES: " + ES);
			logDebug("AR: " + AR);
			
		 if (BR && ES && AR){
				logDebug("**all tasks are complete-issuing license for application: " + capId);
				closeTask("Application Status","License Issued",vWFComment," ");
				if(appMatch("Licenses/Nursing/Nurse Specialty/Application")){
					issueNurseSpecialtyLicense();
				}
				else{
					issueProfessionalLicense();
				}
		}
		// Process temp license 
		if (AInfo["Temporary License for Canadian Licensees"] == "CHECKED"){
			if (BR && AR && tempStatus){
				issueTempLicense();
			}
		}
		
		// close temp record
		if (BR && AR && wfTask == "Examination Status" && wfStatus == "Passed"){
			if (AInfo["Temporary License for Canadian Licensees"] == "CHECKED"){;
				pCapType = "Licenses/Nursing/Registered Nurse/Temporary License";
				pParentCapId = thisCapModel;
				tempId = childGetByCapType(pCapType, pParentCapId);
				if(tempId){
					updateAppStatus("Inactive", vWFComment, tempId);
					updateTask("License Status", "Inactive", vWFComment, "", "LIC_NURSING_TMPLIC", tempId);
				}
			}
		}
		
	} // wfProcess
	
}catch (err){
	logDebug("A JavaScript Error occured in function closeWorkflowIssueLicense: " + err.message);
}
}

/**
 * This function is to be passed in to the
 * createRefContactsFromCapContactsAndLink() function. It looks for matches
 * between PeopleModels.
 * 
 * @example comparePeopleMichigan(PeopleModel);
 * @memberof INCLUDES_CUSTOM
 * @param {PeopleModel}
 *            peop
 * @returns {boolean} Indicates whether a match was found or not (true or false)
 */

function comparePeopleMichigan(peop) {

	/*
	 * 
	 * this function will be passed as a parameter to the
	 * createRefContactsFromCapContactsAndLink function. takes a single
	 * peopleModel as a parameter, and will return the sequence number of the
	 * first G6Contact result returns null if there are no matches
	 * 
	 * Best Practice Template Version uses the following algorithm:
	 * 
	 * 1. Match on SSN/FEIN and either FullName, BusinessName or TradeName if
	 * they exist 2. else, match on Email and either FullName, BusinessName or
	 * TradeName if they exist 3. else, match on Phone1, Phone2, or Phone3 and
	 * either FullName, BusinessName or TradeName if they exist 4. else compare
	 * on Full Name
	 * 
	 * This function can use attributes if desired
	 */

	if ((peop.getSocialSecurityNumber() || peop.getFein())
		&& (peop.getFullName() || peop.getBusinessName() || peop
			.getTradeName())) {
		var qryPeople = aa.people.createPeopleModel().getOutput()
			.getPeopleModel();

		logDebug("we have a SSN " + peop.getSocialSecurityNumber()
			+ " or FEIN, checking on that");
		qryPeople.setSocialSecurityNumber(peop.getSocialSecurityNumber());
		qryPeople.setFein(peop.getFein());
		qryPeople.setFullName(peop.getFullName());
		qryPeople.setBusinessName(peop.getBusinessName());
		qryPeople.setTradeName(peop.getTradeName());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess()) {
			logDebug("WARNING: error searching for people : "
				+ r.getErrorMessage());
			return false;
		}

		var peopResult = r.getOutput();

		if (peopResult.length > 0) {
			logDebug("Searched for a REF Contact, " + peopResult.length
				+ " matches found! returning the first match : "
				+ peopResult[0].getContactSeqNumber());
			return peopResult[0].getContactSeqNumber();
		}
	}

	if (peop.getEmail()
		&& (peop.getFullName() || peop.getBusinessName() || peop
			.getTradeName())) {
		var qryPeople = aa.people.createPeopleModel().getOutput()
			.getPeopleModel();

		qryPeople.setServiceProviderCode(aa.getServiceProviderCode());

		logDebug("we have an Email and (FullName Or Biz Name or Trade Name), checking on that");
		qryPeople.setEmail(peop.getEmail());
		qryPeople.setFullName(peop.getFullName());
		qryPeople.setBusinessName(peop.getBusinessName());
		qryPeople.setTradeName(peop.getTradeName());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess()) {
			logDebug("WARNING: error searching for people : "
				+ r.getErrorMessage());
			return false;
		}

		var peopResult = r.getOutput();

		if (peopResult.length > 0) {
			logDebug("Searched for a REF Contact, " + peopResult.length
				+ " matches found! returning the first match : "
				+ peopResult[0].getContactSeqNumber());
			return peopResult[0].getContactSeqNumber();
		}
	}

	if ((peop.getPhone1() || peop.getPhone2() || peop.getPhone3())
		&& (peop.getFullName() || peop.getBusinessName() || peop
			.getTradeName())) {
		var qryPeople = aa.people.createPeopleModel().getOutput()
			.getPeopleModel();

		qryPeople.setServiceProviderCode(aa.getServiceProviderCode());

		logDebug("we have an Email and (FullName Or Biz Name or Trade Name), checking on that");
		qryPeople.setPhone1(peop.getPhone1());
		qryPeople.setPhone2(peop.getPhone2());
		qryPeople.setPhone3(peop.getPhone3());
		qryPeople.setFullName(peop.getFullName());
		qryPeople.setBusinessName(peop.getBusinessName());
		qryPeople.setTradeName(peop.getTradeName());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess()) {
			logDebug("WARNING: error searching for people : "
				+ r.getErrorMessage());
			return false;
		}

		var peopResult = r.getOutput();

		if (peopResult.length > 0) {
			logDebug("Searched for a REF Contact, " + peopResult.length
				+ " matches found! returning the first match : "
				+ peopResult[0].getContactSeqNumber());
			return peopResult[0].getContactSeqNumber();
		}
	}

	/*
	 * if (peop.getLastName() && peop.getFirstName() && peop.getMiddleName()) {
	 * var qryPeople =
	 * aa.people.createPeopleModel().getOutput().getPeopleModel();
	 * qryPeople.setLastName(peop.getLastName());
	 * qryPeople.setFirstName(peop.getFirstName());
	 * qryPeople.setMiddleName(peop.getMiddleName());
	 * 
	 * var r = aa.people.getPeopleByPeopleModel(qryPeople);
	 * 
	 * if (!r.getSuccess()) { logDebug("WARNING: error searching for people : " +
	 * r.getErrorMessage()); return false; }
	 * 
	 * var peopResult = r.getOutput();
	 * 
	 * if (peopResult.length > 0) { logDebug("Searched for a REF Contact, " +
	 * peopResult.length + " matches found! returning the first match : " +
	 * peopResult[0].getContactSeqNumber() ); return
	 * peopResult[0].getContactSeqNumber(); } }
	 */

	if (peop.getFullName()) {
		var qryPeople = aa.people.createPeopleModel().getOutput()
			.getPeopleModel();
		qryPeople.setFullName(peop.getFullName());

		var r = aa.people.getPeopleByPeopleModel(qryPeople);

		if (!r.getSuccess()) {
			logDebug("WARNING: error searching for people : "
				+ r.getErrorMessage());
			return false;
		}

		var peopResult = r.getOutput();

		if (peopResult.length > 0) {
			logDebug("Searched for a REF Contact, " + peopResult.length
				+ " matches found! returning the first match : "
				+ peopResult[0].getContactSeqNumber());
			return peopResult[0].getContactSeqNumber();
		}
	}

	logDebug("ComparePeople did not find a match");
	return false;
}

/**
 * Checks if Workflow is ready for review, then prepares renewal
 * 
 * @example completeRenewalOnWorkflow();
 * @memberof INCLUDES_CUSTOM
 */

function completeRenewalOnWorkflow() {
	var sendLicEmails = false;
	var capID = getCapId();
	logDebug("Current CAP is = " + capID.getCustomID());
	var parentLicenseCAPID = getParentCapIDForReview(capID)
	if (parentLicenseCAPID != null) {
		if (isWorkflowApproveForReview(capID, aa.env.getValue("WorkflowTask"),
			aa.env.getValue("SD_STP_NUM"), aa.env.getValue("ProcessID"),
			aa.env.getValue("WorkflowStatus"))) {
			var partialCapID = getPartialCapID(capID);
			if (isReadyRenew(parentLicenseCAPID)) {
				renewalCapProject = getRenewalCapByParentCapIDForReview(parentLicenseCAPID);
				if (renewalCapProject != null) {
					aa.cap.updateAccessByACA(capID, "N");
					if (activeLicense(parentLicenseCAPID)) {
						renewalCapProject.setStatus("Complete");
						logDebug("license(" + parentLicenseCAPID
							+ ") is activated.");
						aa.cap.updateProject(renewalCapProject);
						copyKeyInfo(capID, parentLicenseCAPID);
						aa.cap.transferRenewCapDocument(partialCapID,
							parentLicenseCAPID, false);
						logDebug("Transfer document for renew cap. Source Cap: "
							+ partialCapID
							+ ", target Cap: "
							+ parentLicenseCAPID);
						if (sendLicEmails)
							aa.expiration
								.sendApprovedNoticEmailToCitizenUser(parentLicenseCAPID);
					}
				}
			}
		}
		if (isWorkflowDenyForReview(capID, aa.env.getValue("WorkflowTask"),
			aa.env.getValue("SD_STP_NUM"), aa.env.getValue("ProcessID"),
			aa.env.getValue("WorkflowStatus"))) {
			if (isReadyRenew(parentLicenseCAPID)) {
				renewalCapProject = getRenewalCapByParentCapIDForReview(parentLicenseCAPID);
				if (renewalCapProject != null) {
					if (sendLicEmails)
						aa.expiration
							.sendDeniedNoticeEmailToCitizenUser(parentLicenseCAPID)
				}
			}
		}
	}
}

/**
 * Takes in a template for a CapModel and converts it to a real CapModel
 * 
 * @example convert2RealCAP(CapModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapModel}
 *            capModel
 * @returns {CapModel} Returns the real version of the CapModel
 */

function convert2RealCAP(capModel) {
	var originalCAPID = capModel.getCapID().getCustomID();
	var originalCAP = capModel;
	var capWithTemplateResult = aa.cap.getCapWithTemplateAttributes(capModel);
	var capWithTemplate = null;
	if (capWithTemplateResult.getSuccess()) {
		capWithTemplate = capWithTemplateResult.getOutput();
	} else {
		logDebug(capWithTemplateResult.getErrorMessage());
		return null;
	}

	// 2. Convert asi group.
	aa.cap.convertAppSpecificInfoGroups2appSpecificInfos4ACA(capModel);
	if (capModel.getAppSpecificTableGroupModel() != null) {
		aa.cap.convertAppSpecTableField2Value4ACA(capModel);
	}
	// 4. Trigger event before convert to real CAP.
	aa.cap.runEMSEScriptBeforeCreateRealCap(capModel, null);
	// 5. Convert to real CAP.
	convertResult = aa.cap.createRegularCapModel4ACA(capModel, null, false,
		false);
	if (convertResult.getSuccess()) {
		capModel = convertResult.getOutput();
		logDebug("Commit OK: Convert partial CAP to real CAP successful: "
			+ originalCAPID + " to " + capModel.getCapID().getCustomID());
	} else {
		logDebug(convertResult.getErrorMessage());
		return null;
	}
	// 6. Create template after convert to real CAP.
	aa.cap.createTemplateAttributes(capWithTemplate, capModel);
	// Trigger event after convert to real CAP.
	aa.cap.runEMSEScriptAfterCreateRealCap(capModel, null);
	return capModel;
}

/**
 * Takes in an array of Contact Address Script Models and converts to Contact Address Models
 * 
 * @example convertContactAddressModelArr(AddressScriptModel[]);
 * @memberof INCLUDES_CUSTOM
 * @param {AddressScriptModel[]}
 *            contactAddressScriptModelArr
 * @returns {AddressScriptModel[]} Returns the converted version of the Contact
 *          Address array
 */

function convertContactAddressModelArr(contactAddressScriptModelArr) {
	var contactAddressModelArr = null;
	if (contactAddressScriptModelArr != null
		&& contactAddressScriptModelArr.length > 0) {
		logDebug(contactAddressScriptModelArr.length + " addresses");
		contactAddressModelArr = aa.util.newArrayList();
		for (loopk in contactAddressScriptModelArr) {
			contactAddressModelArr.add(contactAddressScriptModelArr[loopk]
				.getContactAddressModel());
		}
	}
	return contactAddressModelArr;
}

/**
 * Converts License Renewal to a real License
 * 
 * @example convertRenewalToReal();
 * @memberof INCLUDES_CUSTOM
 */

function convertRenewalToReal() {
	var sendLicEmails = false;
	logDebug("convertRenewalToReal");
	var capID = getCapId();
	logDebug(capID.getCustomID());
	var partialCapID = getPartialCapID(capID);
	// var result = aa.cap.isRenewalInProgess(capID);
	// if (result.getSuccess()) {
	parentLicenseCAPID = getParentLicenseCapID(capID);
	if (parentLicenseCAPID != null) {
		// 1. Set B1PERMIT.B1_ACCESS_BY_ACA to "N" for partial CAP to not allow
		// that it is searched by ACA user.
		// aa.cap.updateAccessByACA(capID, "N");

		// var parentLicenseCAPID = result.getOutput();
		// 2 . Copy key information from child CAP to parent CAP.
		logDebug("Copying key information from renewal CAP to license CAP");
		copyKeyInfo(capID, parentLicenseCAPID);

		// 3. move renew document to parent cap
		aa.cap.transferRenewCapDocument(partialCapID, parentLicenseCAPID, true);
		logDebug("Transfer document for renew cap. Source Cap: " + partialCapID
			+ ", target Cap:" + parentLicenseCAPID);

		// 4. Send auto-issurance license email to public user
		if (sendLicEmails)
			aa.expiration.sendAutoIssueLicenseEmail(parentLicenseCAPID);
		// logDebug("send auto-issuance license email to citizen user.");
		aa.env.setValue("isAutoIssuanceSuccess", "Yes");
	}
	// else { logDebug("isRenewalInProgress returned error " +
	// result.getErrorMessage()); }
	else {
		logDebug("Parent License Cap ID is null");
	}
}

/**
 * Copies extra information from one License to another License
 * 
 * @requires getAdditionalInfoForLic(CapIDModel)
 * 			 getCapDetailByID(CapIDModel)
 * @example copyAdditionalInfoForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyAdditionalInfoForLic(srcCapId, targetCapId) {
	// 1. Get Additional Information with source CAPID. (BValuatnScriptModel)
	var additionalInfo = getAdditionalInfoForLic(srcCapId);
	if (additionalInfo == null) {
		return;
	}
	// 2. Get CAP detail with source CAPID.
	var capDetail = getCapDetailByID(srcCapId);
	// 3. Set target CAP ID to additional info.
	additionalInfo.setCapID(targetCapId);
	if (capDetail != null) {
		capDetail.setCapID(targetCapId);
	}
	// 4. Edit or create additional infor for target CAP.
	aa.cap.editAddtInfo(capDetail, additionalInfo);
}

// Return BValuatnScriptModel for additional info.

/**
 * Copies the Address from one License to another License
 * 
 * @requires getAddressForLic(CapIDModel)
 * @example copyAdditionalInfoForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyAddressForLic(srcCapId, targetCapId) {
	// 1. Get address with source CAPID.
	var capAddresses = getAddressForLic(srcCapId);
	if (capAddresses == null || capAddresses.length == 0) {
		return;
	}
	// 2. Get addresses with target CAPID.
	var targetAddresses = getAddressForLic(targetCapId);
	// 3. Check to see which address is matched in both source and target.
	for (loopk in capAddresses) {
		sourceAddressfModel = capAddresses[loopk];
		// 3.1 Set target CAPID to source address.
		sourceAddressfModel.setCapID(targetCapId);
		targetAddressfModel = null;
		// 3.2 Check to see if sourceAddress exist.
		if (targetAddresses != null && targetAddresses.length > 0) {
			for (loop2 in targetAddresses) {
				if (isMatchAddress(sourceAddressfModel, targetAddresses[loop2])) {
					targetAddressfModel = targetAddresses[loop2];
					break;
				}
			}
		}
		// 3.3 It is a matched address model.
		if (targetAddressfModel != null) {

			// 3.3.1 Copy information from source to target.
			aa.address.copyAddressModel(sourceAddressfModel,
				targetAddressfModel);
			// 3.3.2 Edit address with source address information.
			aa.address.editAddressWithAPOAttribute(targetCapId,
				targetAddressfModel);
		}
		// 3.4 It is new address model.
		else {
			// 3.4.1 Create new address.
			aa.address.createAddressWithAPOAttribute(targetCapId,
				sourceAddressfModel);
		}
	}
}

/**
 * Copies App Specific Information to a new Cap
 * 
 * @requires editAppSpecific(AppSpecificInfoScriptModel,
 *           AppSpecificInfoScriptModel[], CapModel)
 * @example copyAppSpecificForLic(AppSpecificInfoScriptModel, CapModel);
 * @memberof INCLUDES_CUSTOM
 * @param {AppSpecificInfoScriptModel[]}
 *            AInfo
 * @param {CapModel}
 *            newCap
 */

function copyAppSpecificForLic(AInfo, newCap) // copy all App Specific info
// into new Cap, 1 optional
// parameter for ignoreArr
{
	var ignoreArr = new Array();
	var limitCopy = false;
	if (arguments.length > 2) {
		ignoreArr = arguments[2];
		limitCopy = true;
	}

	for (asi in AInfo) {
		if (limitCopy) {
			var ignore = false;
			for (var i = 0; i < ignoreArr.length; i++) {
				if (asi.indexOf(ignoreArr[i]) == 0) {
					// if(ignoreArr[i] == asi){
					logDebug("ignoring " + asi);
					ignore = true;
					break;
				}
			}
			if (!ignore)
				editAppSpecific(asi, AInfo[asi], newCap);
		} else
			editAppSpecific(asi, AInfo[asi], newCap);
	}
}

/**
 * Copies App Specific Info to a License
 * 
 * @requires copyAppSpecificForLic(AppSpecificInfoScriptModel, CapModel)
 * @example copyAppSpecificInfoForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */


function copyAppSpecificInfoForLic(srcCapId, targetCapId)
{
	var ignore = lookup("EMSE:ASI Copy Exceptions","License/*/*/*");
	logDebug("Ignore = " + ignore);
	var ignoreArr = new Array();
	if(ignore != null) ignoreArr = ignore.split("|"); 
	var AppSpecInfo = new Array();
	useAppSpecificGroupName = true;
	loadAppSpecific(AppSpecInfo,srcCapId);
	copyAppSpecificForLic(AppSpecInfo,targetCapId, ignoreArr);
	useAppSpecificGroupName = false;
}
	

/**
 * Copies App Specific Table to a License
 * 
 * @requires getAppSpecificTableForLic(CapIDModel, String)
 * @example copyAppSpecificTableForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */


function copyAppSpecificTableForLic(srcCapId, targetCapId) {
	var tableNameArray = getTableName(srcCapId);
	var targetTableNameArray = getTableName(targetCapId);
	if (tableNameArray == null) {
		logDebug("tableNameArray is null, returning");
		return;
	}
	for (loopk in tableNameArray) {
		var tableName = tableNameArray[loopk];
		if (IsStrInArry(tableName, targetTableNameArray)) {
			//1. Get appSpecificTableModel with source CAPID
			var sourceAppSpecificTable = getAppSpecificTableForLic(srcCapId, tableName);
			//2. Edit AppSpecificTableInfos with target CAPID
			var srcTableModel = null;
			if (sourceAppSpecificTable == null) {
				logDebug("sourceAppSpecificTable is null");
				return;
			}
			else {
				srcTableModel = sourceAppSpecificTable.getAppSpecificTableModel();

				tgtTableModelResult = aa.appSpecificTableScript.getAppSpecificTableModel(targetCapId, tableName);
				if (tgtTableModelResult.getSuccess()) {
					tgtTableModel = tgtTableModelResult.getOutput();
					if (tgtTableModel == null) {
						logDebug("target table model is null");
					}
					else {
						tgtGroupName = tgtTableModel.getGroupName();
						srcTableModel.setGroupName(tgtGroupName);
					}
				}
				else { logDebug("Error getting target table model " + tgtTableModelResult.getErrorMessage()); }
			}
			editResult = aa.appSpecificTableScript.editAppSpecificTableInfos(srcTableModel,
				targetCapId,
				null);
			if (editResult.getSuccess()) {
				logDebug("Successfully editing appSpecificTableInfos");
			}
			else {
				logDebug("Error editing appSpecificTableInfos " + editResult.getErrorMessage());
			}
		}
		else {
			logDebug("Table " + tableName + " is not defined on target");
		}
	}

}


/**
 * Retrieves Cap Condition from a License and copies it to another License
 * 
 * @requires getCapConditionByCapIDForLic(CapIDModel)
 * @example copyCapConditionForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyCapConditionForLic(srcCapId, targetCapId) {
	// 1. Get Cap condition with source CAPID.
	var capConditions = getCapConditionByCapIDForLic(srcCapId);
	if (capConditions == null || capConditions.length == 0) {
		return;
	}
	// 2. Get Cap condition with target CAPID.
	var targetCapConditions = getCapConditionByCapIDForLic(targetCapId);
	// 3. Check to see which Cap condition is matched in both source and target.
	for (loopk in capConditions) {
		sourceCapCondition = capConditions[loopk];
		// 3.1 Set target CAPID to source Cap condition.
		sourceCapCondition.setCapID(targetCapId);
		targetCapCondition = null;
		// 3.2 Check to see if source Cap condition exist in target CAP.
		if (targetCapConditions != null && targetCapConditions.length > 0) {
			for (loop2 in targetCapConditions) {
				if (isMatchCapCondition(sourceCapCondition,
					targetCapConditions[loop2])) {
					targetCapCondition = targetCapConditions[loop2];
					break;
				}
			}
		}
		// 3.3 It is a matched Cap condition model.
		if (targetCapCondition != null) {
			// 3.3.1 Copy information from source to target.
			sourceCapCondition.setConditionNumber(targetCapCondition
				.getConditionNumber());
			// 3.3.2 Edit Cap condition with source Cap condition information.
			aa.capCondition.editCapCondition(sourceCapCondition);
		}
		// 3.4 It is new Cap condition model.
		else {
			// 3.4.1 Create new Cap condition.
			aa.capCondition.createCapCondition(sourceCapCondition);
		}
	}
}

/**
 * Creates duplicates of Contacts with Addresses and assigns a new Cap ID
 * 
 * @requires getPeople(CapIDModel)
 * @example copyContactsWithAddresses(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            sourceCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyContactsWithAddresses(sourceCapId, targetCapId) {

	var capPeoples = getPeople(sourceCapId);
	if (capPeoples != null && capPeoples.length > 0) {
		for (loopk in capPeoples) {
			sourcePeopleModel = capPeoples[loopk];
			sourcePeopleModel.getCapContactModel().setCapID(targetCapId);
			aa.people.createCapContactWithAttribute(sourcePeopleModel
				.getCapContactModel());
			logDebug("added contact");
		}
	} else {
		logDebug("No peoples on source");
	}
}

/**
 * Copies education list from one Contact to another Contact
 * 
 * @example copyContEducation(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyContEducation(srcCapId, targetCapId) {
	if (srcCapId != null && targetCapId != null) {
		aa.continuingEducation.copyContEducationList(srcCapId, targetCapId);
	}
}

/**
 * Copies education list from one Cap to another Cap
 * 
 * @example copyEducation(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyEducation(srcCapId, targetCapId) {
	if (srcCapId != null && targetCapId != null) {
		aa.education.copyEducationList(srcCapId, targetCapId);
	}
}

/**
 * Copies examination list from one Cap to another Cap
 * 
 * @example copyExamination(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */


function copyExamination(srcCapId, targetCapId) {
	if (srcCapId != null && targetCapId != null) {
		aa.examination.copyExaminationList(srcCapId, targetCapId);
	}
}


/**
 * Copies all important information from one Cap to another Cap
 * 
 * @requires copyAppSpecificInfoForLic(CapIDModel, CapIDModel),
 *           copyAddressForLic(CapIDModel, CapIDModel),
 *           copyAppSpecificTableForLic(CapIDModel, CapIDModel),
 *           copyParcelForLic(CapIDModel, CapIDModel),
 *           copyPeopleForLic(CapIDModel, CapIDModel),
 *           copyLicenseProfessionalForLic(CapIDModel, CapIDModel),
 *           copyOwnerForLic(CapIDModel, CapIDModel),
 *           copyCapConditionForLic(CapIDModel, CapIDModel),
 *           copyAdditionalInfoForLic(CapIDModel, CapIDModel),
 *           copyEducation(CapIDModel, CapIDModel),
 *           copyContEducation(CapIDModel, CapIDModel),
 *           copyExamination(CapIDModel, CapIDModel),
 *           copyRenewCapDocument(CapIDModel, CapIDModel)
 * @example copyKeyInfo(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyKeyInfo(srcCapId, targetCapId) {
	copyAppSpecificInfoForLic(srcCapId, targetCapId);
	copyAddressForLic(srcCapId, targetCapId);
	copyAppSpecificTableForLic(srcCapId, targetCapId);
	copyParcelForLic(srcCapId, targetCapId);
	copyPeopleForLic(srcCapId, targetCapId);
	copyLicenseProfessionalForLic(srcCapId, targetCapId);
	copyOwnerForLic(srcCapId, targetCapId);
	copyCapConditionForLic(srcCapId, targetCapId);
	copyAdditionalInfoForLic(srcCapId, targetCapId);
	if (vEventName == "ConvertToRealCapAfter") {
		copyEducation(srcCapId, targetCapId);
		copyContEducation(srcCapId, targetCapId);
		copyExamination(srcCapId, targetCapId);
		var currentUserID = aa.env.getValue("CurrentUserID");
		copyRenewCapDocument(srcCapId, targetCapId, currentUserID);
	}
}

/**
 * Copies License Professional from one Cap to another Cap
 * 
 * @requires getLicenseProfessionalForLic(CapIDModel)
 *           isMatchLicenseProfessional(LicenseProfessionalScriptModel,
 *           LicenseProfessionalScriptModel)
 * @example copyLicenseProfessionalForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */

function copyLicenseProfessionalForLic(srcCapId, targetCapId) {
	// 1. Get license professionals with source CAPID.
	var capLicenses = getLicenseProfessionalForLic(srcCapId);
	if (capLicenses == null || capLicenses.length == 0) {
		return;
	}
	// 2. Get license professionals with target CAPID.
	var targetLicenses = getLicenseProfessionalForLic(targetCapId);
	// 3. Check to see which licProf is matched in both source and target.
	for (loopk in capLicenses) {
		sourcelicProfModel = capLicenses[loopk];
		// 3.1 Set target CAPID to source lic prof.
		sourcelicProfModel.setCapID(targetCapId);
		targetLicProfModel = null;
		// 3.2 Check to see if sourceLicProf exist.
		if (targetLicenses != null && targetLicenses.length > 0) {
			for (loop2 in targetLicenses) {
				if (isMatchLicenseProfessional(sourcelicProfModel,
					targetLicenses[loop2])) {
					targetLicProfModel = targetLicenses[loop2];
					break;
				}
			}
		}
		// 3.3 It is a matched licProf model.
		if (targetLicProfModel != null) {
			// 3.3.1 Copy information from source to target.
			aa.licenseProfessional.copyLicenseProfessionalScriptModel(
				sourcelicProfModel, targetLicProfModel);
			// 3.3.2 Edit licProf with source licProf information.
			aa.licenseProfessional.editLicensedProfessional(targetLicProfModel);
		}
		// 3.4 It is new licProf model.
		else {
			// 3.4.1 Create new license professional.
			aa.licenseProfessional
				.createLicensedProfessional(sourcelicProfModel);
		}
	}
}

/**
 * Copies Owner from one License to another License
 * 
 * @requires getOwnerForLic(CapIDModel)
 * @example copyOwnerForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel}
 *            srcCapId
 * @param {CapIDModel}
 *            targetCapId
 */


function copyOwnerForLic(srcCapId, targetCapId) {
	//1. Get Owners with source CAPID.
	var capOwners = getOwnerForLic(srcCapId);
	if (capOwners == null || capOwners.length == 0) {
		return;
	}
	//2. Get Owners with target CAPID.
	var targetOwners = getOwnerForLic(targetCapId);
	//3. Check to see which owner is matched in both source and target.
	for (loopk in capOwners) {
		sourceOwnerModel = capOwners[loopk];
		//3.1 Set target CAPID to source Owner.
		sourceOwnerModel.setCapID(targetCapId);
		targetOwnerModel = null;
		//3.2 Check to see if sourceOwner exist.
		if (targetOwners != null && targetOwners.length > 0) {
			for (loop2 in targetOwners) {
				if (isMatchOwner(sourceOwnerModel, targetOwners[loop2])) {
					targetOwnerModel = targetOwners[loop2];
					break;
				}
			}
		}
		//3.3 It is a matched owner model.
		if (targetOwnerModel != null) {
			//3.3.1 Copy information from source to target.
			aa.owner.copyCapOwnerModel(sourceOwnerModel, targetOwnerModel);
			//3.3.2 Edit owner with source owner information. 
			aa.owner.updateDailyOwnerWithAPOAttribute(targetOwnerModel);
		}
		//3.4 It is new owner model.
		else {
			//3.4.1 Create new Owner.
			aa.owner.createCapOwnerWithAPOAttribute(sourceOwnerModel);
		}
	}
}


/**
 * Retrieves parcels from Cap and copies to the target License
 * 
 * @requires getParcelForLic(CapIDModel)
 * @example copyParcelForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel} srcCapId
 * @param {CapIDModel} targetCapId
 */

function copyParcelForLic(srcCapId, targetCapId) {
	//1. Get parcels with source CAPID.
	var copyParcels = getParcelForLic(srcCapId);
	if (copyParcels == null || copyParcels.length == 0) {
		return;
	}
	//2. Get parcel with target CAPID.
	var targetParcels = getParcelForLic(targetCapId);
	//3. Check to see which parcel is matched in both source and target.
	for (i = 0; i < copyParcels.size(); i++) {
		sourceParcelModel = copyParcels.get(i);
		//3.1 Set target CAPID to source parcel.
		sourceParcelModel.setCapID(targetCapId);
		targetParcelModel = null;
		//3.2 Check to see if sourceParcel exist.
		if (targetParcels != null && targetParcels.size() > 0) {
			for (j = 0; j < targetParcels.size(); j++) {
				if (isMatchParcel(sourceParcelModel, targetParcels.get(j))) {
					targetParcelModel = targetParcels.get(j);
					break;
				}
			}
		}
		//3.3 It is a matched parcel model.
		if (targetParcelModel != null) {
			//3.3.1 Copy information from source to target.
			var tempCapSourceParcel = aa.parcel.warpCapIdParcelModel2CapParcelModel(targetCapId, sourceParcelModel).getOutput();
			var tempCapTargetParcel = aa.parcel.warpCapIdParcelModel2CapParcelModel(targetCapId, targetParcelModel).getOutput();
			aa.parcel.copyCapParcelModel(tempCapSourceParcel, tempCapTargetParcel);
			//3.3.2 Edit parcel with sourceparcel. 
			aa.parcel.updateDailyParcelWithAPOAttribute(tempCapTargetParcel);
		}
		//3.4 It is new parcel model.
		else {
			//3.4.1 Create new parcel.
			aa.parcel.createCapParcelWithAPOAttribute(aa.parcel.warpCapIdParcelModel2CapParcelModel(targetCapId, sourceParcelModel).getOutput());
		}
	}
}


/**
 * Retrieves people from Cap and copies to the target License
 * 
 * @requires getPeopleForLic(CapIDModel)
 * @example copyPeopleForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {any} srcCapId
 * @param {any} targetCapId
 */

function copyPeopleForLic(srcCapId, targetCapId) {
	//1. Get people with source CAPID.
	var capPeoples = getPeopleForLic(srcCapId);
	if (capPeoples == null || capPeoples.length == 0) {
		return;
	}
	//2. Get people with target CAPID.
	var targetPeople = getPeopleForLic(targetCapId);
	//3. Check to see which people is matched in both source and target.
	for (loopk in capPeoples) {
		sourcePeopleModel = capPeoples[loopk];
		//3.1 Set target CAPID to source people.
		sourcePeopleModel.getCapContactModel().setCapID(targetCapId);
		targetPeopleModel = null;
		//3.2 Check to see if sourcePeople exist.
		if (targetPeople != null && targetPeople.length > 0) {
			for (loop2 in targetPeople) {
				if (isMatchPeople(sourcePeopleModel, targetPeople[loop2])) {
					targetPeopleModel = targetPeople[loop2];
					break;
				}
			}
		}
		//3.3 It is a matched people model.
		if (targetPeopleModel != null) {
			//3.3.1 Copy information from source to target.
			aa.people.copyCapContactModel(sourcePeopleModel.getCapContactModel(), targetPeopleModel.getCapContactModel());
			//3.3.2 Copy contact address from source to target.
			if (targetPeopleModel.getCapContactModel().getPeople() != null && sourcePeopleModel.getCapContactModel().getPeople()) {
				targetPeopleModel.getCapContactModel().getPeople().setContactAddressList(sourcePeopleModel.getCapContactModel().getPeople().getContactAddressList());
			}

			//3.3.3 Edit People with source People information. 
			aa.people.editCapContactWithAttribute(targetPeopleModel.getCapContactModel());
		}
		//3.4 It is new People model.
		else {
			//3.4.1 Create new people.
			aa.people.createCapContactWithAttribute(sourcePeopleModel.getCapContactModel());
		}
	}
}


/**
 * Copies Cap Document to another Cap
 * 
 * @example copyPeopleForLic(CapIDModel, CapIDModel);
 * @memberof INCLUDES_CUSTOM
 * @param {CapIDModel} srcCapId
 * @param {CapIDModel} targetCapId
 * @param {String} currentUserID
 */


function copyRenewCapDocument(srcCapId, targetCapId, currentUserID) {
	if (srcCapId != null && targetCapId != null) {
		aa.cap.copyRenewCapDocument(srcCapId, targetCapId, currentUserID);
	}
}


/**
 * 
 * 
 * @param {any} grp
 * @param {any} typ
 * @param {any} stype
 * @param {any} cat
 * @param {any} desc
 * @returns
 */

function createLicenseParent(grp, typ, stype, cat, desc)
//
// creates the new application and returns the capID object
//
{
	var appCreateResult = aa.cap.createAppRegardlessAppTypeStatus(grp, typ, stype, cat, desc);
	logDebug("creating cap " + grp + "/" + typ + "/" + stype + "/" + cat);
	if (appCreateResult.getSuccess()) {
		var newId = appCreateResult.getOutput();
		logDebug("cap " + grp + "/" + typ + "/" + stype + "/" + cat + " created successfully ");

		// create Detail Record
		capModel = aa.cap.newCapScriptModel().getOutput();
		capDetailModel = capModel.getCapModel().getCapDetailModel();
		capDetailModel.setCapID(newId);
		aa.cap.createCapDetail(capDetailModel);

		var newObj = aa.cap.getCap(newId).getOutput();	//Cap object
		var result = aa.cap.createAppHierarchy(newId, capId);
		if (result.getSuccess())
			logDebug("Parent application successfully linked");
		else
			logDebug("Could not link applications");

		// Copy Parcels

		var capParcelResult = aa.parcel.getParcelandAttribute(capId, null);
		if (capParcelResult.getSuccess()) {
			var Parcels = capParcelResult.getOutput().toArray();
			for (zz in Parcels) {
				logDebug("adding parcel #" + zz + " = " + Parcels[zz].getParcelNumber());
				var newCapParcel = aa.parcel.getCapParcelModel().getOutput();
				newCapParcel.setParcelModel(Parcels[zz]);
				newCapParcel.setCapIDModel(newId);
				newCapParcel.setL1ParcelNo(Parcels[zz].getParcelNumber());
				newCapParcel.setParcelNo(Parcels[zz].getParcelNumber());
				aa.parcel.createCapParcel(newCapParcel);
			}
		}

		// Copy Contacts
		var capPeoples = getPeople(capId);
		if (capPeoples != null && capPeoples.length > 0) {
			for (loopk in capPeoples) {
				sourcePeopleModel = capPeoples[loopk];
				sourcePeopleModel.getCapContactModel().setCapID(newId);
				aa.people.createCapContactWithAttribute(sourcePeopleModel.getCapContactModel());
				logDebug("added contact");
			}
		}

		// Copy Addresses
		capAddressResult = aa.address.getAddressByCapId(capId);
		if (capAddressResult.getSuccess()) {
			Address = capAddressResult.getOutput();
			for (yy in Address) {
				newAddress = Address[yy];
				newAddress.setCapID(newId);
				aa.address.createAddress(newAddress);
				logDebug("added address");
			}
		}

		return newId;
	}
	else {
		logDebug("**ERROR: adding parent App: " + appCreateResult.getErrorMessage());
	}
}



function createRefLicProf(rlpId,rlpType,pContactType)
	{
	//Creates/updates a reference licensed prof from a Contact
	//06SSP-00074, modified for 06SSP-00238
	var updating = false;
	var capContResult = aa.people.getCapContactByCapID(capId);
	if (capContResult.getSuccess())
		{ conArr = capContResult.getOutput();  }
	else
		{
		logDebug ("**ERROR: getting cap contact: " + capAddResult.getErrorMessage());
		return false;
		}

	if (!conArr.length)
		{
		logDebug ("**WARNING: No contact available");
		return false;
		}


	var newLic = getRefLicenseProf(rlpId)

	if (newLic)
		{
		updating = true;
		logDebug("Updating existing Ref Lic Prof : " + rlpId);
		}
	else
		var newLic = aa.licenseScript.createLicenseScriptModel();

	//get contact record
	if (pContactType==null)
		var cont = conArr[0]; //if no contact type specified, use first contact
	else
		{
		var contFound = false;
		for (yy in conArr)
			{
			if (pContactType.equals(conArr[yy].getCapContactModel().getPeople().getContactType()))
				{
				cont = conArr[yy];
				contFound = true;
				break;
				}
			}
		if (!contFound)
			{
			logDebug ("**WARNING: No Contact found of type: "+pContactType);
			return false;
			}
		}

	peop = cont.getPeople();
	addr = peop.getCompactAddress();

	newLic.setContactFirstName(cont.getFirstName());
	//newLic.setContactMiddleName(cont.getMiddleName());  //method not available
	newLic.setContactLastName(cont.getLastName());
	newLic.setBusinessName(peop.getBusinessName());
	newLic.setAddress1(addr.getAddressLine1());
	newLic.setAddress2(addr.getAddressLine2());
	newLic.setAddress3(addr.getAddressLine3());
	newLic.setCity(addr.getCity());
	newLic.setState(addr.getState());
	newLic.setZip(addr.getZip());
	newLic.setPhone1(peop.getPhone1());
	newLic.setPhone2(peop.getPhone2());
	newLic.setEMailAddress(peop.getEmail());
	newLic.setFax(peop.getFax());

	newLic.setAgencyCode(aa.getServiceProviderCode());
	newLic.setAuditDate(sysDate);
	newLic.setAuditID(currentUserID);
	newLic.setAuditStatus("A");

	if (AInfo["Insurance Co"]) 		newLic.setInsuranceCo(AInfo["Insurance Co"]);
	if (AInfo["Insurance Amount"]) 		newLic.setInsuranceAmount(parseFloat(AInfo["Insurance Amount"]));
	if (AInfo["Insurance Exp Date"]) 	newLic.setInsuranceExpDate(aa.date.parseDate(AInfo["Insurance Exp Date"]));
	if (AInfo["Policy #"]) 			newLic.setPolicy(AInfo["Policy #"]);

	if (AInfo["Business License #"]) 	newLic.setBusinessLicense(AInfo["Business License #"]);
	if (AInfo["Business License Exp Date"]) newLic.setBusinessLicExpDate(aa.date.parseDate(AInfo["Business License Exp Date"]));

	newLic.setLicenseType(rlpType);

	if(addr.getState() != null)
		newLic.setLicState(addr.getState());
	else
		newLic.setLicState("AK"); //default the state if none was provided

	newLic.setStateLicense(rlpId);

	if (updating)
		myResult = aa.licenseScript.editRefLicenseProf(newLic);
	else
		myResult = aa.licenseScript.createRefLicenseProf(newLic);

	if (myResult.getSuccess())
		{
		logDebug("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		logMessage("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		return true;
		}
	else
		{
		logDebug("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		logMessage("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		return false;
		}
	}



function currencyFormat (num) {
    return "$" + num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}


// denies and closes all application types - renewal, application, relicensure, reinstatement

function denyApplication(){
	var vWFComment = "Updated via EMSE Script";
	
	if (wfTask == "Background Review" || wfTask == "Renewal Review") {
		if (wfStatus == "Denied"){
			
			if (appTypeArray[3] == "Renewal"){
				logDebug("appTypeArray: " + appTypeArray[3]);
				updateAppStatus("Renewal Denied", vWFComment);
				closeTask("Renewal Status", "Denied", vWFComment, "");
			}
			
			if (appTypeArray[3] == "Application"){
				logDebug("appTypeArray: " + appTypeArray[3]);
				updateAppStatus("Application Denied", vWFComment);
				closeTask("Application Status", "Denied", vWFComment, "");
			}
			
			if (appTypeArray[2] == "Relicensure"){
				logDebug("appTypeArray: " + appTypeArray[2]);
				updateAppStatus("Relicensure Denied", vWFComment);
				closeTask("Relicensure Status", "Denied", vWFComment, "");
				if(isTaskActive("Relicensure Review")){
					deactivateTask("Relicensure Review");
				}	
			}
			
			// These two could apply to either application or relicensure
			
			if(isTaskActive("Examination Status")){
				deactivateTask("Examination Status");
			}
			
			if(isTaskActive("Application Review")){
				deactivateTask("Application Review");
			}
						
			if (appTypeArray[2] == "Reinstatement Reclassification"){
				logDebug("appTypeArray: " + appTypeArray[2]);
				activateTask("Compliance Drafting");
				updateTask("Compliance Drafting", "Pending Drafting", vWFComment, "");
				if(isTaskActive("Reinstatement Review")){
					deactivateTask("Reinstatement Review");
				}
			}
			
		} // status = denied
	} // task
} // function
function doesASITRowExist(tName, cName, cValue) { // optional capId

	if (arguments.length > 3)
		itemCap = arguments[3];

	tempASIT = loadASITable(tName, itemCap);

	var rowFound = false;
	for (var ea in tempASIT) {
 		var row = tempASIT[ea];
                fv = "" + row[cName].fieldValue;
                cValue = "" + cValue;
                r = new RegExp("^" + cValue + "(.)*"); 

		if ((String(fv).match(r)) || (fv == cValue)) {
 				return true;
                                
                }
	}
	return rowFound;
}


function doesRecordExist(appNum) {
	var getCapResult = aa.cap.getCapID(appNum);
	if (getCapResult.getSuccess()) {
		var resObj = getCapResult.getOutput();
		if (resObj != null) return true;
	}
	return false;
}	
	



function doesStatusExistInTaskHistory(tName, tStatus) {

	histResult = aa.workflow.getWorkflowHistory(capId, tName, null);
	if (histResult.getSuccess()) {
		var taskHistArr = histResult.getOutput();
		for (var xx in taskHistArr) {
			taskHist = taskHistArr[xx];
			if (tStatus.equals(taskHist.getDisposition()))
				return true;
		}
		return false;
		
	}
	else {
		logDebug("Error getting task history : " + histResult.getErrorMessage());
	}
	return false;

}


function editAdditionalInfo(capId, constTypeCode, hCnt, bCnt)
//Introduced by David H.  
{
	//1. Get Additional Information with CAPID.  (BValuatnScriptModel)
	var  additionalInfo = getAdditionalInfo(capId);

	//2. Get CAP detail with CAPID.
	var  capDetail = getCapDetailByID(capId);

	//3. Set Additional Info
	capDetail.setConstTypeCode(constTypeCode);
	capDetail.setHouseCount(parseFloat(hCnt));
	capDetail.setBuildingCount(parseFloat(bCnt));

	//4. Edit or create additional infor for the CAP.
	aa.cap.editAddtInfo(capDetail, additionalInfo);
}


function editAddressOfContact(cType, aType, licCapId, addr1, addr2, city, state, zip) {
	// edits or adds an address to a contact of the specified type
	var conToChange = null; 
	consResult = aa.people.getCapContactByCapID(licCapId);
	if (consResult.getSuccess()) {
		cons = consResult.getOutput();
		for (thisCon in cons) {
			if (cons[thisCon].getCapContactModel().getPeople().getContactType() == cType) { 
				conToChange = cons[thisCon].getCapContactModel(); 
				contactNbr = conToChange.getContactSeqNumber(); 
				refContactNbr = conToChange.getRefContactNumber();  
				p = conToChange.getPeople(); 
				contactAddressListResult = aa.address.getContactAddressListByCapContact(conToChange);
				if (contactAddressListResult.getSuccess()) { 
					contactAddressList = contactAddressListResult.getOutput();
					foundAddressType = false;
					logDebug(contactAddressList);
					for (var x in contactAddressList) {
						cal= contactAddressList[x];
						addrType = cal.getAddressType();
						aa.print(addrType);
						if (addrType == aType) {
							foundAddressType = true;
							contactAddressID = cal.getAddressID();
							cResult = aa.address.getContactAddressByPK(cal.getContactAddressModel());
							if (cResult.getSuccess()) {
								casm = cResult.getOutput(); // contactAddressScriptModel
								casm.setAddressLine1(addr1);
								logDebug(addr1);
								casm.setAddressLine2(addr2);
								casm.setCity(city);
								casm.setState(state);
								casm.setZip(zip);
								logDebug(refContactNbr == null);
								if (refContactNbr == null) {
									editResult = aa.address.editCapContactAddress(licCapId, casm.getContactAddressModel());
									if (!editResult.getSuccess()) logDebug("Error editing contact address " + editResult.getErrorMessage());
									else { logDebug("Successfully edited address on contact "); }
								}
								else {
									editResult = aa.address.editContactAddress(casm.getContactAddressModel());
									if (!editResult.getSuccess()) logDebug("Error editing contact address " + editResult.getErrorMessage());
								}
							}
							else { logDebug("Error getting contact address by PK " + cResult.getErrorMessage()); }
						}
					}
					convertedContactAddressList = convertContactAddressModelArr(contactAddressList);
					if (foundAddressType) {
						p.setContactAddressList(convertedContactAddressList);
						conToChange.setPeople(p); 
						editResult = aa.people.editCapContactWithAttribute(conToChange);
						if (!editResult.getSuccess()) logDebug("error modifying existing contact : " + editResult.getErrorMessage());
					}
					else {	// address doesn't exist, create a new one
						var newadd = aa.proxyInvoker.newInstance("com.accela.orm.model.address.ContactAddressModel").getOutput();
    						newadd.setEntityType("CONTACT");
						newadd.setEntityID(parseFloat(contactNbr));
						newadd.setAddressType(aType);
    						newadd.setAddressLine1(addr1);
    						newadd.setAddressLine2(addr2);
    						newadd.setCity(city);
   						newadd.setState(state);
    						newadd.setZip(zip);
						//newadd.setPhone(phone);
						createResult = aa.address.createCapContactAddress(licCapId, newadd);
						if (createResult.getSuccess()) {
							newAddrObj = createResult.getOutput();
							if (newAddrObj != null) {
								cam = newAddrObj.getContactAddressModel();
								auditModel = cam.getAuditModel();
								caPKModel = cam.getContactAddressPK();
								newadd.setAuditModel(auditModel);
								newadd.setContactAddressPK(caPKModel);
								newContactAddrList = aa.util.newArrayList();
								for (loopk in contactAddressList) newContactAddrList.add(contactAddressList[loopk].getContactAddressModel());
								newContactAddrList.add(newadd);
								p.setContactAddressList(newContactAddrList);
								conToChange.setPeople(p); 
								editResult = aa.people.editCapContactWithAttribute(conToChange);
								if (!editResult.getSuccess()) logDebug("error adding a new address to a contact : " + editResult.getErrorMessage());
							}
						}
						else {
							logDebug("Error creating a new cap contact address " + createResult.getErrorMessage());
						}
					}
				}
			}
		}
	}
	else logDebug("No contacts");
}


function editAddressOfLicenseHolder(aType, licCapId, addr1, addr2, city, state, zip, phone) {

	var conToChange = null; 
	consResult = aa.people.getCapContactByCapID(licCapId);
	if (consResult.getSuccess()) {
		cons = consResult.getOutput();
		for (thisCon in cons) {
			if (cons[thisCon].getCapContactModel().getPeople().getContactType() == "License Holder") { 
				conToChange = cons[thisCon].getCapContactModel(); 
				p = conToChange.getPeople(); 
				contactAddressListResult = aa.address.getContactAddressListByCapContact(conToChange);
				if (contactAddressListResult.getSuccess()) { 
					contactAddressList = contactAddressListResult.getOutput();
					for (var x in contactAddressList) {
						cal= contactAddressList[x];
						addrType = "" + cal.getAddressType();
						if (addrType == aType) {
							contactAddressID = cal.getAddressID();
							cResult = aa.address.getContactAddressByPK(cal.getContactAddressModel());
							if (cResult.getSuccess()) {
								casm = cResult.getOutput();
								casm.setAddressLine1(addr1);
								casm.setAddressLine2(addr2);
								casm.setCity(city);
								casm.setState(state);
								casm.setZip(zip);
								casm.setPhone(phone);
								aa.address.editContactAddress(casm.getContactAddressModel());
							}
						}
					}	
					convertedContactAddressList = convertContactAddressModelArr(contactAddressList);
					p.setContactAddressList(convertedContactAddressList);
					conToChange.setPeople(p); 
					aa.people.editCapContactWithAttribute(conToChange);
				}
			}
		}
	}
}



function editCapConditionStatus(pType,pDesc,pStatus,pStatusType) {
    // updates a condition with the pType and pDesc
    // to pStatus and pStatusType, returns true if updates, false if not
    // will not update if status is already pStatus && pStatusType
    // all parameters are required except for pType
    // optional fromStatus for 5th paramater
    // optional capId for 6th parameter

    var itemCap = capId;
    var fromStatus = "";

    if (arguments.length > 4) {
        fromStatus = arguments[4];
    }   

    if (arguments.length > 5) {
        itemCap = arguments[5];
    }

    if (pType==null)
        var condResult = aa.capCondition.getCapConditions(itemCap);
    else
        var condResult = aa.capCondition.getCapConditions(itemCap,pType);
        
    if (condResult.getSuccess())
        var capConds = condResult.getOutput();
    else
        { 
        logMessage("**ERROR: getting cap conditions: " + condResult.getErrorMessage());
        logDebug("**ERROR: getting cap conditions: " + condResult.getErrorMessage());
        return false;
        }

    var conditionUpdated = false;

    for (cc in capConds) {
        var thisCond = capConds[cc];
        var cStatus = thisCond.getConditionStatus();
        var cStatusType = thisCond.getConditionStatusType();
        var cDesc = thisCond.getConditionDescription();
        var cImpact = thisCond.getImpactCode();
        logDebug(cStatus + ": " + cStatusType);
        
        if (cDesc.toUpperCase() == pDesc.toUpperCase()) {
            if (fromStatus.toUpperCase().equals(cStatus.toUpperCase()) || fromStatus == "") {
                thisCond.setConditionStatus(pStatus);
                thisCond.setConditionStatusType(pStatusType);
                thisCond.setImpactCode("Required");
                aa.capCondition.editCapCondition(thisCond);
                conditionUpdated = true; // condition has been found and updated
            } 
        }
    }
    
    
    if (conditionUpdated) {
        logDebug("Condition has been found and updated to a status of: " + pStatus);
    } else {
        logDebug("ERROR: no matching condition found");
    }
    
    return conditionUpdated; //no matching condition found

}


function editContactTemplateInfo(vAttributeName,vAttributeValue,vContactTypes){
	
	var itemCap = capId;
	var vContactTypeArray = null;
	if (arguments.length == 4) itemCap = arguments[3]; // use cap ID specified in args
	if (vContactTypes){
		if( typeof vContactTypes === 'string' ) {
			// If a string is provided add it to an array
			vContactTypeArray = new Array(vContactTypes);
		}
		else{
			if(vContactTypes.length > 0)
				vContactTypeArray = vContactTypes;
		}
	}
	
	var vContactObjArray = new Array();

	vContactObjArray = getContactObjs(itemCap,vContactTypeArray);
	
	for(iCont in vContactObjArray){
		var vContactObj = vContactObjArray[iCont];
		
		vContactObj.setAttribute(vAttributeName,vAttributeValue);
		vContactObj.save();
		
		if(vContactObj.refSeqNumber){
			vContactObj.syncCapContactToReference();
		}
		else{
			logDebug("(editContactTemplateInfo) Contact Not Found In Referece: " + capIDString + " - " +vContactObj.toString());
			//createRefContactsFromCapContactsAndLink(capId, vContactTypeArray, null, false, true, comparePeopleMichigan);
		}

	}
}
function editFireAddInfo() // optional process name
//Introduced by David H.

{
	var ccTypeParts = false;
	var ccPType = "999"; // default if no Construction Code in ASI
	var ccType = false;
	var ccType = AInfo["Construction Type"];
	if(ccType){
		var r1 = ccType.replace('(','Z');
		var r2 = r1.replace(')','Z');
		var r3 = r2.split("Z");
	
		var ccPType =  r3[1];
		if(r3[0] == "Type V"){
			ccPType =  ccPType + "V";
		}
	}
	
	editAdditionalInfo(capId, ccPType, "0", "0");
	logDebug("New CC code is " +  ccPType);
}


function editNameOfContact(cType, lCapId, fName, mName, lName, oName, dbaName) {
	logDebug("In editNameOfContactLocal");
	var found = false;
	var conToChange = null; 
	consResult = aa.people.getCapContactByCapID(lCapId);
	if (consResult.getSuccess()) {
		cons = consResult.getOutput();
		for (thisCon in cons) {
			var thisContact = cons[thisCon];
			if (thisContact.getCapContactModel().getPeople().getContactType() == cType) { 
				found = true;
				conToChange = thisContact.getCapContactModel(); 
				contactTypeFlag = conToChange.getContactTypeFlag();
				fNameStr = "" + fName;
				logDebug(fNameStr);
				if (fNameStr != "undefined") {
					if (fNameStr == "null")
						conToChange.setFirstName("");
					else
						conToChange.setFirstName(fNameStr);
				}
				lNameStr = "" + lName;
				logDebug(lNameStr);
				if (lNameStr != "undefined") {
					if (lNameStr == "null")
						conToChange.setLastName("");
					else
						conToChange.setLastName(lNameStr);
				}
				mNameStr = "" + mName;
				logDebug(mNameStr);
				if (mNameStr != "undefined") {
					if (mNameStr == "null")
						conToChange.setMiddleName("");
					else
						conToChange.setMiddleName(mNameStr);
				}
				oNameStr = "" + oName;
				logDebug(oNameStr);
				if (oNameStr != "undefined") {
					if (oNameStr == "null") 
						conToChange.setBusinessName("");
					else
						conToChange.setBusinessName(oNameStr);
				}
				dbaNameStr = "" + dbaName;
				logDebug(dbaNameStr);
				if (dbaNameStr != "undefined") {
					if (dbaNameStr == "null") 
						conToChange.setFullName("");
					else
						conToChange.setFullName(dbaNameStr);
				}
				editResult = aa.people.editCapContactWithAttribute(conToChange);
				if (!editResult.getSuccess()) {
					logDebug("error modifying existing contact : " + editResult.getErrorMessage());
				} else {
					logDebug("Contact updated successfully");
				}
			}
		}
		if(found == false){
			logDebug("That contact type does not exist on the license. Adding contact...");
			var peopleModel = aa.people.getPeopleModel();
			peopleModel.setServiceProviderCode("LARA"); 
			peopleModel.setContactType("Individual");
			if(cType == "License Holder"){
				peopleModel.setContactTypeFlag("Individual");
			} else if(cType == "Representing Company"){
				peopleModel.setContactTypeFlag("Individual");
			} else if(cType == "Operator"){
				peopleModel.setContactTypeFlag("Individual");
			}
			fNameStr = "" + fName;
			logDebug(fNameStr);
			if (fNameStr != "undefined") {
				if (fNameStr == "null")
					peopleModel.setFirstName("");
				else
					peopleModel.setFirstName(fNameStr);
			}
			lNameStr = "" + lName;
			logDebug(lNameStr);
			if (lNameStr != "undefined") {
				if (lNameStr == "null")
					peopleModel.setLastName("");
				else
					peopleModel.setLastName(lNameStr);
			}
			mNameStr = "" + mName;
			logDebug(mNameStr);
			if (mNameStr != "undefined") {
				if (mNameStr == "null")
					peopleModel.setMiddleName("");
				else
					peopleModel.setMiddleName(mNameStr);
			}
			oNameStr = "" + oName;
			logDebug(oNameStr);
			if (oNameStr != "undefined") {
				if (oNameStr == "null") 
					peopleModel.setBusinessName("");
				else
					peopleModel.setBusinessName(oNameStr);
			}
			dbaNameStr = "" + dbaName;
			logDebug(dbaNameStr);
			if (dbaNameStr != "undefined") {
				if (dbaNameStr == "null") 
					peopleModel.setFullName("");
				else
					peopleModel.setFullName(dbaNameStr);
			}
			
			var createResult = aa.people.createPeople(peopleModel);
		
			if (createResult.getSuccess()) {
				var peopResult = aa.people.getPeopleByPeopleModel(peopleModel)
				var peops = peopResult.getOutput();
				logDebug("Successfully created reference contact: " + peops[0].contactSeqNumber);
				var contactPeopleModel = peops[0].getPeopleModel();
				contactPeopleModel.setContactType("Representing Company");
				var createCapContactResult = aa.people.createCapContactWithRefPeopleModel(lCapId,contactPeopleModel);
				if (createCapContactResult.getSuccess()) {
					logDebug("Successfully created cap contact");
				} else {
					logDebug("**ERROR: Creating cap contact with seq " + " - " + createCapContactResult.getErrorMessage());
				}
			} else {
				logDebug("**ERROR: " + createResult.getErrorMessage());
			}	
		}
	}else {
		logDebug("Error getting app spec info " + consResult.getErrorMessage());
	}
}
function editPhoneOfLicenseHolder(aType, licCapId, homePhoneNumber, mobilePhoneNumber, businessPhoneNumber) {
	var conToChange = null; 
	consResult = aa.people.getCapContactByCapID(licCapId);
	if (consResult.getSuccess()) {
		cons = consResult.getOutput();
		for (thisCon in cons) {
			if (cons[thisCon].getCapContactModel().getPeople().getContactType() == aType) { 
				conToChange = cons[thisCon].getCapContactModel(); 
				conToChange.setPhone1(homePhoneNumber);
				conToChange.setPhone2(mobilePhoneNumber);
				conToChange.setPhone3(businessPhoneNumber);
				aa.people.editCapContact(conToChange);
			}
			}
		}
	}


function editWorkflowTaskDueDateOnCapId(wfstr, wfdate, thisCapId) // optional process name.  if wfstr == "*", set for all tasks
{
	var capIdToChange = thisCapId;
	var useProcess = false;
	var processName = "";
	if (arguments.length == 4) {
		processName = arguments[3]; // subprocess
		useProcess = true;
	}

	var taskDesc = wfstr;
	if (wfstr == "*") {
		taskDesc = "";
	}
	var workflowResult = aa.workflow.getTaskItems(capIdToChange, taskDesc, processName, null, null, null);
	if (workflowResult.getSuccess())
		wfObj = workflowResult.getOutput();
	else {
		logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage());
		return false;
	}
		logDebug(wfObj[0]);
	for (i in wfObj) {

		var fTask = wfObj[i];
		if ((fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) || wfstr == "*") && (!useProcess || fTask.getProcessCode().equals(processName))) {
			wfObj[i].setDueDate(aa.date.parseDate(wfdate));
			var fTaskModel = wfObj[i].getTaskItem();
			var tResult = aa.workflow.adjustTaskWithNoAudit(fTaskModel);
			if (tResult.getSuccess())
				logDebug("Set Workflow Task: " + fTask.getTaskDescription() + " due Date " + wfdate);
			else {
				logMessage("**ERROR: Failed to update due date on workflow: " + tResult.getErrorMessage());
				return false;
			}
		}
	}
}
function emptyFeeInvoiceQueue() {
logDebug("There are currently " + feeSeqList.length + " fees to invoice");
	if (feeSeqList.length) {
		invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
		if (invoiceResult.getSuccess())
			logMessage("Invoicing assessed fee items is successful.");
		else
			logMessage("**ERROR: Invoicing the fee items assessed to app # " + capIDString + " was not successful.  Reason: " +  invoiceResult.getErrorMessage());
	}
	feeSeqList = new Array();						// invoicing fee list
	paymentPeriodList = new Array();				// invoicing pay periods

}


function examLogicContractorLicense(){
	var invokingEvent = aa.env.getValue("EventName");
	logDebug("Invoked from " + invokingEvent);

	if (invokingEvent == "ExaminationUpdateBefore") {
		if(!isEmpty(examinationModel)){
			// Attempting to schedule one exam
			var examName = examinationModel.getExamName();
			var examStatus = examinationModel.getExamStatus()
			if(!matches(examName, "Law")){
				if(!checkWorkClassificationsExamApproval(examName,"Approved")){
					showMessage = true; 
					comment("Cannot Schedule " + examName + " prior to approval."); 
					cancel = true;
				}
			}
		}
		
		if(originalExamModel){
			// Attempting to re-schedule an exam	
		}

		if (!isEmpty(examinationList) && typeof (examinationList) == "object" && typeof (examinationList) != "string") {
			// Attempting to schedule or re-schedule multiple exams
			var ei = examinationList.iterator();
			
			while (ei.hasNext()) {
				var exam = ei.next();
				var examName = "" + exam.getExamName();
				var examStatus = "" + exam.getExamStatus()
				logDebug("Checking exam " + examName + " status " + examStatus);
				if(!matches(examName, "Law")){
					if(matches(examStatus,"PENDING","SCHEDULED") && !checkWorkClassificationsExamApproval(examName,"Approved")){
						showMessage = true; 
						comment("Cannot Schedule " + examName + " prior to approval"); 
						cancel = true;
					}
				}
			}
		} 
	}
}

function feeTotalByStatus(feeStatus) {
	var statusArray = new Array(); 
	if (arguments.length > 0) {
		for (var i=0; i<arguments.length; i++)
			statusArray.push(arguments[i]);
	}
        
	var feeTotal = 0;
	var feeResult=aa.fee.getFeeItems(capId);
	if (feeResult.getSuccess()) { 
		var feeObjArr = feeResult.getOutput(); 
		for (ff in feeObjArr) {
                        feeStatus = "" + feeObjArr[ff].getFeeitemStatus();
			if (exists(feeStatus,statusArray)) 
				feeTotal+=feeObjArr[ff].getFee();
                        
		}

	}
	else { 
		logDebug( "Error getting fee items: " + feeResult.getErrorMessage()); 
	}
	return feeTotal;
}



function generateAltID(licCapId) {
	var thisCap = aa.cap.getCap(licCapId).getOutput();
	var thisCapType = thisCap.getCapType();
	var thisTypeArray = thisCapType.toString().split("/");
   	var thisCustomID = licCapId.getCustomID();
   	var thisCustomIDArray = thisCustomID.split("-");
   	var newLicAInfo = new Array();
	
	//var yearNumber = thisCustomID.match(/\d+/)[0] // Find the index of the first number capId String
	//var numIndex = thisCustomID.indexOf(yearNumber);
	var vLicenseNum = thisCustomID.substring(0,10); // Grab the first 10 digits

 	var newAltID = vLicenseNum
	logDebug("(generateAltID) newAltID = " + newAltID);

    return newAltID;
}
function getAdditionalInfo(capId)
//Introduced by David H. 
{
	bvaluatnScriptModel = null;
	var s_result = aa.cap.getBValuatn4AddtInfo(capId);
	if(s_result.getSuccess())
	{
		bvaluatnScriptModel = s_result.getOutput();
		if (bvaluatnScriptModel == null)
		{
			aa.print("WARNING: no additional info on this CAP:" + capId);
			bvaluatnScriptModel = null;
		}
	}
	else
	{
		aa.print("ERROR: Failed to get additional info: " + s_result.getErrorMessage());
		bvaluatnScriptModel = null;	
	}
	// Return bvaluatnScriptModel
	return bvaluatnScriptModel;
}


function getAdditionalInfoForLic(capId)
{
	bvaluatnScriptModel = null;
	var s_result = aa.cap.getBValuatn4AddtInfo(capId);
	if(s_result.getSuccess())
	{
		bvaluatnScriptModel = s_result.getOutput();
		if (bvaluatnScriptModel == null)
		{
			logDebug("WARNING: no additional info on this CAP:" + capId);
			bvaluatnScriptModel = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to get additional info: " + s_result.getErrorMessage());
		bvaluatnScriptModel = null;	
	}
	// Return bvaluatnScriptModel
	return bvaluatnScriptModel;
}


function getAddressForLic(capId)
{
	capAddresses = null;
	var s_result = aa.address.getAddressByCapId(capId);
	if(s_result.getSuccess())
	{
		capAddresses = s_result.getOutput();
		if (capAddresses == null || capAddresses.length == 0)
		{
			logDebug("WARNING: no addresses on this CAP:" + capId);
			capAddresses = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to address: " + s_result.getErrorMessage());
		capAddresses = null;	
	}
	return capAddresses;
}


function getAppSpecificTableForLic(capId,tableName)
{
	appSpecificTable = null;
	var s_result = aa.appSpecificTableScript.getAppSpecificTableModel(capId,tableName);
	if(s_result.getSuccess())
	{
		appSpecificTable = s_result.getOutput();
		if (appSpecificTable == null || appSpecificTable.length == 0)
		{
			logDebug("WARNING: no appSpecificTable on this CAP:" + capId);
			appSpecificTable = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to appSpecificTable: " + s_result.getErrorMessage());
		appSpecificTable = null;	
	}
	return appSpecificTable;
}


function getCapConditionByCapIDForLic(capId)
{
	capConditionScriptModels = null;
	
	var s_result = aa.capCondition.getCapConditions(capId);
	if(s_result.getSuccess())
	{
		capConditionScriptModels = s_result.getOutput();
		if (capConditionScriptModels == null || capConditionScriptModels.length == 0)
		{
			logDebug("WARNING: no cap condition on this CAP:" + capId);
			capConditionScriptModels = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to get cap condition: " + s_result.getErrorMessage());
		capConditionScriptModels = null;	
	}
	return capConditionScriptModels;
}


function getCapDetailByID(capId) {
	capDetailScriptModel = null;
	var s_result = aa.cap.getCapDetail(capId);
	if(s_result.getSuccess()) {
		capDetailScriptModel = s_result.getOutput();
		if (capDetailScriptModel == null) {
			logDebug("WARNING: no cap detail on this CAP:" + capId);
			capDetailScriptModel = null;
		}
	}
	else {
		logDebug("ERROR: Failed to get cap detail: " + s_result.getErrorMessage());
		capDetailScriptModel = null;	
	}
	// Return capDetailScriptModel
	return capDetailScriptModel;
}



function getCAPModel(capIDModel) {
	var capModel = aa.cap.getCapViewBySingle4ACA(capIDModel);
	if (capModel == null) {
		logDebug("Fail to get CAP model: " + capIDModel.toString());
		return null;
	}
	
	return capModel;
}



function childGetByCapType(pCapType, pParentCapId) 
	{
	// Returns capId object of first child of pParentCapId whose cap type matches pCapType parameter
	// Wildcard * may be used in pCapType, e.g. "Building/Commercial/*/*"
	// Optional 3rd parameter pChildCapIdSkip: capId of child to skip
	// 06SSP-00219.C61201
  //
	if (pParentCapId!=null) //use cap in parameter 
		var vCapId = pParentCapId;
	else // use current cap
		var vCapId = capId;
		
	if (arguments.length>2)
		var childCapIdSkip = arguments[2];
	else
		var childCapIdSkip = null;
		
	var typeArray = pCapType.split("/");
	if (typeArray.length != 4)
		logDebug("**ERROR in childGetByCapType function parameter.  The following cap type parameter is incorrectly formatted: " + pCapType);
		
	var getCapResult = aa.cap.getChildByMasterID(vCapId);
	if (getCapResult.getSuccess())
		{
		var childArray = getCapResult.getOutput();
		if (childArray.length)
			{
			var childCapId;
			var capTypeStr = "";
			var childTypeArray;
			var isMatch;
			for (xx in childArray)
				{
				childCapId = childArray[xx].getCapID();
				if (childCapIdSkip!=null && childCapIdSkip.getCustomID().equals(childCapId.getCustomID())) //skip over this child
					continue;
				
				capTypeStr = aa.cap.getCap(childCapId).getOutput().getCapType().toString();	// Convert cap type to string ("Building/A/B/C")
				childTypeArray = capTypeStr.split("/");
				isMatch = true;
				for (yy in childTypeArray) //looking for matching cap type
					{
					if (!typeArray[yy].equals(childTypeArray[yy]) && !typeArray[yy].equals("*"))
						{
						isMatch = false;
						break;
						}
					}
				if (isMatch)
					return childCapId;
				}
			}
		else
			logDebug( "**WARNING: childGetByCapType function found no children");	
			
		return false;
		}
	else
		logDebug( "**WARNING: childGetByCapType function found no children: " + getCapResult.getErrorMessage());
		
	return false;
	}

function getComponentAliasName(componentName)
{
	if(componentNames==null)
	{
		return null;
	}
	else
	{
		for(var i=0;i<componentNames.length;i++){
			if(componentNames[i]==componentName)
			{
				return componentAliasNames[i];
			}
		}
		return null;
	}
}


function getDocOperation(docModelList)
{
	var docModel = docModelList.get(0);
	if(docModel == null)
	{
		return false;
	}
	
	if(docModel.getCategoryByAction() == null || "".equals(docModel.getCategoryByAction()))
	{
		return "UPLOAD";
	}
	//Judging it's check in
	else if("CHECK-IN".equals(docModel.getCategoryByAction()))
	{
		return "CHECK_IN";
	}
	//Judging it's resubmit or normal upload.
	else if("RESUBMIT".equals(docModel.getCategoryByAction()))
	{
		return "RESUBMIT";
	}
}



function getDocumentList() {
	//Introduced 09/23/2015 by Jaime S.
	// Returns an array of documentmodels if any
	// returns an empty array if no documents

	var docListArray = new Array();

	docListResult = aa.document.getCapDocumentList(capId,currentUserID);

	if (docListResult.getSuccess()) {		
		docListArray = docListResult.getOutput();
	}
	return docListArray;
}



function getExpirationStatus(capId) {
	b1ExpResult = aa.expiration.getLicensesByCapID(capId);
	if (b1ExpResult.getSuccess()) {
		this.b1Exp = b1ExpResult.getOutput();
		licStatus = this.b1Exp.getExpStatus();
		return licStatus;
	} else {
		return false;
	}
}


function getFeeAmount(FeeCode) {
	var feeA = loadFees(capId);
	var tmpFeeTotAmount = 0;

	for (x in feeA){
		thisFee = feeA[x];

		if (thisFee.code == FeeCode && (thisFee.status == "INVOICED" || thisFee.status == "NEW")){
			tmpFeeTotAmount = tmpFeeTotAmount + thisFee.amount;
		}
	}
	return tmpFeeTotAmount;
}



function getFeeBalance() {

	var amtFee = 0;
	var amtPaid = 0;

	var feeResult=aa.fee.getFeeItems(capId);
	if (feeResult.getSuccess())
		{ var feeObjArr = feeResult.getOutput(); }
	else
		{ logDebug( "**ERROR: getting fee items: " + capContResult.getErrorMessage()); return false }

	for (ff in feeObjArr) {
		amtFee+=feeObjArr[ff].getFee();
		var pfResult = aa.finance.getPaymentFeeItems(capId, null);
		if (pfResult.getSuccess()) {
			var pfObj = pfResult.getOutput();
			for (ij in pfObj)
				if (feeObjArr[ff].getFeeSeqNbr() == pfObj[ij].getFeeSeqNbr())
					amtPaid+=pfObj[ij].getFeeAllocation()
		}
	}
	return amtFee - amtPaid;
}


function getFeeQty(FeeCode) {
	var feeA = loadFees(capId);
	var tmpFeeTotQty = 0;

	for (x in feeA){
		thisFee = feeA[x];

		if (thisFee.code == FeeCode && (thisFee.status == "INVOICED" || thisFee.status == "NEW")){
			tmpFeeTotQty = tmpFeeTotQty + thisFee.unit;
		}
	}
	return tmpFeeTotQty;
}


function getFieldValue(fieldName, asiGroups)
{     
		if(asiGroups == null)
		{
			return null;
		}
		
    var iteGroups = asiGroups.iterator();
    while (iteGroups.hasNext())
    {
        var group = iteGroups.next();
        var fields = group.getFields();
        if (fields != null)
        {
            var iteFields = fields.iterator();
            while (iteFields.hasNext())
            {
                var field = iteFields.next();              
                if (fieldName == field.getCheckboxDesc())
                {
                    return field.getChecklistComment();
                }
            }
        }
    }   
    return null;    
}

//End of Conditional Pageflow Functions


function getFirstIssuedDate() { // option CapId
	var vFirstIssuedDate
	var itemCap = capId

		if (arguments.length > 0)
			itemCap = arguments[0]; // use cap ID specified in args


		var cdScriptObjResult = aa.cap.getCapDetail(itemCap);

	if (!cdScriptObjResult.getSuccess()) {

		logDebug("**ERROR: No cap detail script object : " + cdScriptObjResult.getErrorMessage());
		return false;
	}

	var cdScriptObj = cdScriptObjResult.getOutput();

	if (!cdScriptObj) {

		logDebug("(getFirstIssuedDate) **ERROR: No cap detail script object");
		return false;
	}

	cd = cdScriptObj.getCapDetailModel();

	vFirstIssuedDate = convertDate(aa.date.parseDate(cd.getFirstIssuedDate()));

	if(vFirstIssuedDate){
		logDebug("(getFirstIssuedDate) First Issued Date  is " + jsDateToMMDDYYYY(vFirstIssuedDate));
		return vFirstIssuedDate;
	}
	else{
		logDebug("(getFirstIssuedDate) **ERROR getting first issued date");
		return false
	}
}
function getIfVeteran(){
	var itemCap = capId
	if (arguments.length > 0) itemCap = arguments[0]; // use cap ID specified in args
	
	var isVeteran = false;
	var vetCustomField = getAppSpecific("Veteran",itemCap);
	// Check the Custom Fields on the Transaction Record
	if(vetCustomField == "Yes" || vetCustomField == "Y"){
				isVeteran = true;
	}

	return isVeteran;
}


function getIncompleteCapId()  {
    	var s_id1 = aa.env.getValue("PermitId1");
   	var s_id2 = aa.env.getValue("PermitId2");
    	var s_id3 = aa.env.getValue("PermitId3");

    	var result = aa.cap.getCapIDModel(s_id1, s_id2, s_id3);
    	if(result.getSuccess()) {
    		return result.getOutput();
	}  
    	else { logDebug("ERROR: Failed to get capId: " + result.getErrorMessage()); return null; }
}


function getLicenseProfessionalASB(e){

capLicenseArr=null;
var t=aa.licenseProfessional.getLicenseProf(e);
return t.getSuccess()?(capLicenseArr=t.getOutput(),(null==capLicenseArr||0==capLicenseArr.length)&&(aa.print("WARNING: no licensed professionals on this CAP:"+e),capLicenseArr=null)):(aa.print("ERROR: Failed to license professional: "+t.getErrorMessage()),capLicenseArr=null),capLicenseArr
}	


function getLicenseProfessionalForLic(capId)
{
	capLicenseArr = null;
	var s_result = aa.licenseProfessional.getLicenseProf(capId);
	if(s_result.getSuccess())
	{
		capLicenseArr = s_result.getOutput();
		if (capLicenseArr == null || capLicenseArr.length == 0)
		{
			logDebug("WARNING: no licensed professionals on this CAP:" + capId);
			capLicenseArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to license professional: " + s_result.getErrorMessage());
		capLicenseArr = null;	
	}
	return capLicenseArr;
}



function getOwnerForLic(capId)
{
	capOwnerArr = null;
	var s_result = aa.owner.getOwnerByCapId(capId);
	if(s_result.getSuccess())
	{
		capOwnerArr = s_result.getOutput();
		if (capOwnerArr == null || capOwnerArr.length == 0)
		{
			logDebug("WARNING: no Owner on this CAP:" + capId);
			capOwnerArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to Owner: " + s_result.getErrorMessage());
		capOwnerArr = null;	
	}
	return capOwnerArr;
}


function getPageComponents(capID, stepIndex, pageIndex)
{
	var componentResult = aa.acaPageFlow.getPageComponents(capID, stepIndex, pageIndex);
	
	if(componentResult.getSuccess())
	{
		return componentResult.getOutput();
	}
	
	return null;	
}


function getParcelForLic(capId)
{
	capParcelArr = null;
	var s_result = aa.parcel.getParcelandAttribute(capId, null);
	if(s_result.getSuccess())
	{
		capParcelArr = s_result.getOutput();
		if (capParcelArr == null || capParcelArr.length == 0)
		{
			logDebug("WARNING: no parcel on this CAP:" + capId);
			capParcelArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to parcel: " + s_result.getErrorMessage());
		capParcelArr = null;	
	}
	return capParcelArr;
}


function getParentCapID4Renewal(itemCap) {
    parentLic = getParentLicenseCapID(itemCap);
    pLicArray = String(parentLic).split("-");
    var parentLicenseCAPID = aa.cap.getCapID(pLicArray[0], pLicArray[1], pLicArray[2]).getOutput();

    return parentLicenseCAPID;
}


function getParentCapIDForReview(capid) {
	// for Longmont licensing, renewals may/may not have payments. Need to look for
	// project status of Review and Incomplete
	if (capid == null || aa.util.instanceOfString(capid)) {
		return null;
	}
	//1. Get parent license for review
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", "Review");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel.getProjectID();
		}
	}  
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", "Incomplete");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel.getProjectID();
		}
	}  
	aa.print("ERROR: Failed to get Parent Cap ID");
	return null;
}


function getParentCapVIAPartialCap(capid) {
	logDebug("getParentCapVIAPartialCap");
	var partialCapID = getPartialCapID(capid);
	logDebug("partialCapID " + partialCapID);
	var result2 = aa.cap.getProjectByChildCapID(partialCapID, "Renewal", "Incomplete");
	if(result2.getSuccess()) {
		licenseProjects = result2.getOutput();
		if (licenseProjects == null || licenseProjects.length == 0) {
			logDebug("ERROR: Failed to get parent CAP with partial CAPID(" + capid + ")");
			return null;
		}
		licenseProject = licenseProjects[0];
		// update renewal relationship from partial cap to real cap
		updateRelationship2RealCAP(licenseProject.getProjectID(), capid);
		//Return parent license CAP ID.
		logDebug("Returning project ID of " + licenseProject.getProjectID());
		return licenseProject.getProjectID();
	}
	else { 
		logDebug("Error in getParentCapVIAPartialCap " + result2.getErrorMessage());
		tempCapID = getParentLicenseByCompleteRenewal(capid);
		if (tempCapID != null) {
			tLicArray = String(tempCapID).split("-");
			var tempCapID2 = aa.cap.getCapID(tLicArray[0], tLicArray[1], tLicArray[2]).getOutput();
			logDebug("tempCapID2 = " + tempCapID2.getCustomID());
			return tempCapID2; 
		}
		else {
			logDebug("Did not find complete renewal "); return null;
		}
	}
}


function getParentLicenseByCompleteRenewal(capid) {
	if (capid == null || aa.util.instanceOfString(capid)) { return null; }
	logDebug("Looking for Complete renewal")
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", "Complete");
	if(result.getSuccess() ) {
		logDebug("Found Complete renewal")
		projectScriptModels = result.getOutput();
		projectScriptModel = projectScriptModels[0];
		logDebug("project ID = " + projectScriptModel.getProjectID());
		return projectScriptModel.getProjectID();
	}
	else {
		
		return getParentCapVIAPartialCap(capid);
	}
}


function getParentLicenseCapID(capid) {
	logDebug("getParentLicenseCapID " + capid);
	logDebug(capid.getCustomID());
	if (capid == null || aa.util.instanceOfString(capid)) { return null; }
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", "Incomplete");
	if(result.getSuccess() ) {
		logDebug("Found incomplete renewal")
		projectScriptModels = result.getOutput();
		projectScriptModel = projectScriptModels[0];
		logDebug("Returning project ID of " + projectScriptModel.getProjectID());
		return projectScriptModel.getProjectID();
	}
	else {
		logDebug("Could not get incomplete renewal : " + result.getErrorMessage());
		return getParentCapVIAPartialCap(capid);
	}
}


function getPartialCapID(capid) {
	if (capid == null || aa.util.instanceOfString(capid)) {
		return null;
	}
	//1. Get original partial CAPID  from related CAP table.
	var result = aa.cap.getProjectByChildCapID(capid, "EST", null);
	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (projectScriptModels == null || projectScriptModels.length == 0) {
			logDebug("ERROR: Failed to get partial CAP with CAPID(" + capid + ")");
			return null;
		}
		//2. Get original partial CAP ID from project Model
		projectScriptModel = projectScriptModels[0];
		return projectScriptModel.getProjectID();
	}  
	else { logDebug("ERROR: Failed to get partial CAP by child CAP(" + capid + "): " + result.getErrorMessage()); return null; }
}



function getPeople(capId)
{
	capPeopleArr = null;
	var s_result = aa.people.getCapContactByCapID(capId);
	if(s_result.getSuccess())
	{
		capPeopleArr = s_result.getOutput();
		if(capPeopleArr != null || capPeopleArr.length > 0)
		{
			for (loopk in capPeopleArr)	
			{
				var capContactScriptModel = capPeopleArr[loopk];
				var capContactModel = capContactScriptModel.getCapContactModel();
				var peopleModel = capContactScriptModel.getPeople();
				var contactAddressrs = aa.address.getContactAddressListByCapContact(capContactModel);
				if (contactAddressrs.getSuccess())
				{
					var contactAddressModelArr = convertContactAddressModelArr(contactAddressrs.getOutput());
					peopleModel.setContactAddressList(contactAddressModelArr);    
				}
			}
		}
		
		else
		{
			capPeopleArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to People: " + s_result.getErrorMessage());
		capPeopleArr = null;	
	}
	return capPeopleArr;
}


function getPeopleForLic(capId)
{
	capPeopleArr = null;
	var s_result = aa.people.getCapContactByCapID(capId);
	if(s_result.getSuccess())
	{
		capPeopleArr = s_result.getOutput();
		if(capPeopleArr != null || capPeopleArr.length > 0)
		{
			for (loopk in capPeopleArr)	
			{
				var capContactScriptModel = capPeopleArr[loopk];
				var capContactModel = capContactScriptModel.getCapContactModel();
				var peopleModel = capContactScriptModel.getPeople();
				var contactAddressrs = aa.address.getContactAddressListByCapContact(capContactModel);
				if (contactAddressrs.getSuccess())
				{
					var contactAddressModelArr = convertContactAddressModelArr(contactAddressrs.getOutput());
					peopleModel.setContactAddressList(contactAddressModelArr);    
				}
			}
		}
		
		else
		{
			logDebug("WARNING: no People on this CAP:" + capId);
			capPeopleArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to People: " + s_result.getErrorMessage());
		capPeopleArr = null;	
	}
	return capPeopleArr;
}


function getPeopleWithAddresses(capId)
{
	capPeopleArr = null;
	var s_result = aa.people.getCapContactByCapID(capId);
	if(s_result.getSuccess())
	{
		capPeopleArr = s_result.getOutput();
		if(capPeopleArr != null || capPeopleArr.length > 0)
		{
			for (loopk in capPeopleArr)	
			{
				var capContactScriptModel = capPeopleArr[loopk];
				var capContactModel = capContactScriptModel.getCapContactModel();
				var peopleModel = capContactScriptModel.getPeople();
				var contactAddressrs = aa.address.getContactAddressListByCapContact(capContactModel);
				if (contactAddressrs.getSuccess())
				{
					var contactAddressModelArr = convertContactAddressModelArr(contactAddressrs.getOutput());
					peopleModel.setContactAddressList(contactAddressModelArr);    
				}
			}
		}
		
		else
		{
			capPeopleArr = null;
		}
	}
	else
	{
		logDebug("ERROR: Failed to People: " + s_result.getErrorMessage());
		capPeopleArr = null;	
	}
	return capPeopleArr;
}

function getRefLicenseProf(refstlic)
	{
	var refLicObj = null;
	var refLicenseResult = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(),refstlic);
	if (!refLicenseResult.getSuccess())
		{ logDebug("**ERROR retrieving Ref Lic Profs : " + refLicenseResult.getErrorMessage()); return false; }
	else
		{
		var newLicArray = refLicenseResult.getOutput();
		if (!newLicArray) return null;
		for (var thisLic in newLicArray)
			if (refstlic && newLicArray[thisLic] && refstlic.toUpperCase().equals(newLicArray[thisLic].getStateLicense().toUpperCase()))
				refLicObj = newLicArray[thisLic];
		}

	return refLicObj;
	}


// Applied 09/29 by JS


function getRegisteredNurseSpecialty(pStatus){
	var vRegisteredNurseSpecialtyArray = new Array();
	var vStatus = "Active"
	if (!isEmpty(pStatus)) vStatus = pStatus;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	
	
	if(	appMatch("Licenses/*/*/Application",itemCap) || 
		appMatch("Licenses/*/*/Renewal",itemCap)){
		if(getAppSpecific("Nurse Anesthetist",itemCap)=="CHECKED")
			vRegisteredNurseSpecialtyArray.push("Nurse Anesthetist");
		if(getAppSpecific("Nurse Midwife",itemCap)=="CHECKED")
			vRegisteredNurseSpecialtyArray.push("Nurse Midwife");
		if(getAppSpecific("Nurse Practitioner",itemCap)=="CHECKED")
			vRegisteredNurseSpecialtyArray.push("Nurse Practitioner");
		if(getAppSpecific("Clinical Nurse Specialist",itemCap)=="CHECKED")
			vRegisteredNurseSpecialtyArray.push("Clinical Nurse Specialist");
	}
	else if(appMatch("Licenses/*/*/License",itemCap)){
		var vSpecialtyCertificationTable = loadASITable("NURSE SPECIALTY CERTIFICATION",itemCap);
		for(i in vSpecialtyCertificationTable){
			if(vSpecialtyCertificationTable[i]["Status"].fieldValue==vStatus){
				vRegisteredNurseSpecialtyArray.push(vSpecialtyCertificationTable[i]["Specialty Certification"].fieldValue);
			}
		}
	}
	
	return vRegisteredNurseSpecialtyArray;	
}
function getRenewalCapByParentCapIDForReview(parentCapid) {
	if (parentCapid == null || aa.util.instanceOfString(parentCapid)) {
		return null;
	}
	//1. Get parent license for review
	var result = aa.cap.getProjectByMasterID(parentCapid, "Renewal", "Review");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel;
		}
	}  
	var result = aa.cap.getProjectByMasterID(parentCapid, "Renewal", "Incomplete");
    	if(result.getSuccess()) {
		projectScriptModels = result.getOutput();
		if (!(projectScriptModels == null || projectScriptModels.length == 0)) {
			projectScriptModel = projectScriptModels[0];
			return projectScriptModel;
		}
	}  
	aa.print("ERROR: Failed to get Parent Cap ID");
      return null;
}



function getRenewalCapModel(renRecordID) {
	
	renRecordIDPieces = renRecordID.split("-");
	if (renRecordIDPieces != null && renRecordIDPieces.length == 3) {
		renCapIdResult = aa.cap.getCapID(renRecordIDPieces[0].toString(), renRecordIDPieces[1].toString(), renRecordIDPieces[2].toString());
		if (renCapIdResult.getSuccess()) {
			renewalCapId = renCapIdResult.getOutput();		
			renCapModel = getCAPModel(renewalCapId);
			return renCapModel;
		}
	}
	return null;

}


function getRepresentingCompanyOrgName(itemCap) {
	var contactType = "Representing Company"
	var orgName = "";

	var capContactResult = aa.people.getCapContactByCapID(itemCap);
	if (capContactResult.getSuccess()) {
		var Contacts = capContactResult.getOutput();
		for (yy in Contacts)
			if (contactType.equals(Contacts[yy].getCapContactModel().getPeople().getContactType()))
					if (Contacts[yy].getPeople().getBusinessName() != null)
						orgName = "" + Contacts[yy].getPeople().getBusinessName();
	}
	return orgName;
}




function getStatusDateinTaskHistory(tName, sName) {
	histResult = aa.workflow.getWorkflowHistory(capId, tName, null);
	if (histResult.getSuccess()) {
		var taskHistArr = histResult.getOutput();
		taskHistArr.sort(compareStatusDateDesc);
		for (var xx in taskHistArr) {
			taskHist = taskHistArr[xx];
			statusDate = taskHist.getStatusDate();
			//aa.print(taskHist.getDisposition() + ":" + statusDate);
			if ( (""+ taskHist.getDisposition()) == sName)
				return statusDate;
		}
	}
	return null;
}


function getTableName(capId)
{
	var tableName = null;
	var result = aa.appSpecificTableScript.getAppSpecificGroupTableNames(capId);
	if(result.getSuccess())
	{
		tableName = result.getOutput();
		if(tableName!=null)
		{
			return tableName;
		}
	}
	return tableName;
}


function getWorkflowParams4Notification(params) {

	// pass in a hashtable and it will add the additional parameters to the table
	// This should be called from WorkflowTaskUpdateAfter Event

	if (wfTask) addParameter(params, "$$wfTask$$", wfTask);

	if (wfStatus) addParameter(params, "$$wfStatus$$", wfStatus);

	if (wfDate) addParameter(params, "$$wfDate$$", wfDate);

	if (wfComment) addParameter(params, "$$wfComment$$", wfComment);
	
	if (wfStaffUserID) addParameter(params, "$$wfStaffUserID$$", wfStaffUserID);
	
	if (wfHours) addParameter(params, "$$wfHours$$", wfHours);

	return params;

}	

function hourlyReviewFee(){
//Introduced by Jaime S.

	var project = getAppSpecific("Project Type");
	var billHours = getAppSpecific("Billable Hours");
        var billAmount = billHours * 125;
	
//	if (matches(project,"Alteration","Repair")){
		wfObj = aa.workflow.getTasks(capId).getOutput();
		var facility = getAppSpecific("Facility Type");
		var totalHours = 0;
		for (var i in wfObj){
			fTask = wfObj[i];
			wfHours = fTask.getHoursSpent();
			totalHours += parseFloat(wfHours);			
			logDebug("wfHours = " + wfHours);
		}
		logDebug("Total Hours = " + totalHours);
		logDebug("Bill Hours = " + billHours);
                 logDebug("Bill Amount = " + billAmount);
		logDebug("facility = " + facility);
		logDebug("project = " + project);
		if (facility != "Schools"){
			if (totalHours > 0){
				addFee("PRPE07","PR_PE","FINAL",billAmount,"Y");
			}else{
				addFee("PRPE07","PR_PE","FINAL",1,"Y");
			}
		}else{
			if (totalHours > 0){
				addFee("PRSPPE08","PR_SPPE","FINAL",billAmount,"Y");
			}else{
				addFee("PRSPPE08","PR_SPPE","FINAL",1,"Y");
			}
		}		
//	}
}

function invoiceAllFees() { 

    var feeFound=false; 
    var fperiod = "STANDARD";
    getFeeResult = aa.finance.getFeeItemByCapID(capId); 
    if (getFeeResult.getSuccess()) 
        { 
        var feeList = getFeeResult.getOutput(); 
        for (feeNum in feeList) 
			if (feeList[feeNum].getFeeitemStatus().equals("NEW"))   
				{ 
				var feeSeq = feeList[feeNum].getFeeSeqNbr(); 
				feeSeqList.push(feeSeq); 
				paymentPeriodList.push(fperiod); 
                feeFound=true; 
                } 
        } 
    else 
		{ logDebug( "**ERROR: getting fee items " + getFeeResult.getErrorMessage())} 
    return feeFound; 
    }  



function isActiveLicense(capId) {return matches(getExpirationStatus(capId),"Active","About to Expire")}


function isEmpty(pVariable) {
	if (pVariable === undefined || pVariable == null || pVariable == "") {
		return true;
	} else {
		return false;
	}
}


function isInArray(arr, val) {
	if (arr && arr.length > 0) {
		for (var obj in arr) {
			if (arr[obj] == val) {
				return true;
			}
		}
	}

	return false;
}
function isLicenseType(appType,capId) {return appMatch(appType,capId)}


function isMatchAddress(addressScriptModel1, addressScriptModel2)
{
	if (addressScriptModel1 == null || addressScriptModel2 == null)
	{
		return false;
	}
	var streetName1 = addressScriptModel1.getStreetName();
	var streetName2 = addressScriptModel2.getStreetName();
	if ((streetName1 == null && streetName2 != null) 
		|| (streetName1 != null && streetName2 == null))
	{
		return false;
	}
	if (streetName1 != null && !streetName1.equals(streetName2))
	{
		return false;
	}
	return true;
}


function isMatchCapCondition(capConditionScriptModel1, capConditionScriptModel2)
{
	if (capConditionScriptModel1 == null || capConditionScriptModel2 == null)
	{
		return false;
	}
	var description1 = capConditionScriptModel1.getConditionDescription();
	var description2 = capConditionScriptModel2.getConditionDescription();
	if ((description1 == null && description2 != null) 
		|| (description1 != null && description2 == null))
	{
		return false;
	}
	if (description1 != null && !description1.equals(description2))
	{
		return false;
	}
	var conGroup1 = capConditionScriptModel1.getConditionGroup();
	var conGroup2 = capConditionScriptModel2.getConditionGroup();
	if ((conGroup1 == null && conGroup2 != null) 
		|| (conGroup1 != null && conGroup2 == null))
	{
		return false;
	}
	if (conGroup1 != null && !conGroup1.equals(conGroup2))
	{
		return false;
	}
	return true;
}


function isMatchLicenseProfessional(licProfScriptModel1, licProfScriptModel2)
{
	if (licProfScriptModel1 == null || licProfScriptModel2 == null)
	{
		return false;
	}
	if (licProfScriptModel1.getLicenseType().equals(licProfScriptModel2.getLicenseType())
		&& licProfScriptModel1.getLicenseNbr().equals(licProfScriptModel2.getLicenseNbr()))
	{
		return true;
	}
	return	false;
}


function isMatchOwner(ownerScriptModel1, ownerScriptModel2)
{
	if (ownerScriptModel1 == null || ownerScriptModel2 == null)
	{
		return false;
	}
	var fullName1 = ownerScriptModel1.getOwnerFullName();
	var fullName2 = ownerScriptModel2.getOwnerFullName();
	if ((fullName1 == null && fullName2 != null) 
		|| (fullName1 != null && fullName2 == null))
	{
		return false;
	}
	if (fullName1 != null && !fullName1.equals(fullName2))
	{
		return false;
	}
	return	true;
}


function isMatchParcel(parcelScriptModel1, parcelScriptModel2)
{
	if (parcelScriptModel1 == null || parcelScriptModel2 == null)
	{
		return false;
	}
	if (parcelScriptModel1.getParcelNumber().equals(parcelScriptModel2.getParcelNumber()))
	{
		return true;
	}
	return	false;
}


function isMatchPeople(capContactScriptModel, capContactScriptModel2)
{
	if (capContactScriptModel == null || capContactScriptModel2 == null)
	{
		return false;
	}
	var contactType1 = capContactScriptModel.getCapContactModel().getPeople().getContactType();
	var contactType2 = capContactScriptModel2.getCapContactModel().getPeople().getContactType();
	var firstName1 = capContactScriptModel.getCapContactModel().getPeople().getFirstName();
	var firstName2 = capContactScriptModel2.getCapContactModel().getPeople().getFirstName();
	var lastName1 = capContactScriptModel.getCapContactModel().getPeople().getLastName();
	var lastName2 = capContactScriptModel2.getCapContactModel().getPeople().getLastName();
	var fullName1 = capContactScriptModel.getCapContactModel().getPeople().getFullName();
	var fullName2 = capContactScriptModel2.getCapContactModel().getPeople().getFullName();
	if ((contactType1 == null && contactType2 != null) 
		|| (contactType1 != null && contactType2 == null))
	{
		return false;
	}
	if (contactType1 != null && !contactType1.equals(contactType2))
	{
		return false;
	}
	if ((firstName1 == null && firstName2 != null) 
		|| (firstName1 != null && firstName2 == null))
	{
		return false;
	}
	if (firstName1 != null && !firstName1.equals(firstName2))
	{
		return false;
	}
	if ((lastName1 == null && lastName2 != null) 
		|| (lastName1 != null && lastName2 == null))
	{
		return false;
	}
	if (lastName1 != null && !lastName1.equals(lastName2))
	{
		return false;
	}
	if ((fullName1 == null && fullName2 != null) 
		|| (fullName1 != null && fullName2 == null))
	{
		return false;
	}
	if (fullName1 != null && !fullName1.equals(fullName2))
	{
		return false;
	}
	return	true;
}


function isProjectOfType(projectType){
	for (var i = PROJECTTYPE.length - 1; i >= 0; i--) {
		if (PROJECTTYPE[i]["Project Type"] == projectType){
			return true;
		}
	}
	return false;
}


function isReadyRenew(capid) {
	logDebug("isReadyRenew " + capid);
	if (capid == null || aa.util.instanceOfString(capid)) {
		return false;
	}
	b1ExpResult = aa.expiration.getLicensesByCapID(capid)
	if (b1ExpResult.getSuccess()) {
			b1Exp = b1ExpResult.getOutput();
			tmpStatus = b1Exp.getExpStatus();
			logDebug(tmpStatus);
			tmpDate = b1Exp.getExpDate();
			if (tmpDate) {
				b1ExpDate = tmpDate.getMonth() + "/" + tmpDate.getDayOfMonth() + "/" + tmpDate.getYear();
				logDebug(b1ExpDate);
			}
	}
	else {
		logDebug("Error getting expiration info " + b1ExpResult.getErrorMessage());
	}
	var result = aa.expiration.isExpiredLicenses(capid);
    	if(result.getSuccess()) {
		return true;
	}  
    	else { logDebug("ERROR: Failed to get expiration with CAP(" + capid + "): " + result.getErrorMessage()); }
	return false;
}


function isRenewalCap(capid)
{
	if (capid == null || aa.util.instanceOfString(capid))
	{
		return false;
	}
	//1. Check to see if it is renewal CAP. 
	var result = aa.cap.getProjectByChildCapID(capid, "Renewal", null);
	if(result.getSuccess())
	{
		projectScriptModels = result.getOutput();
		if (projectScriptModels != null && projectScriptModels.length > 0)
		{
			return true;
		}
	}
	return false;
}


function isRenewalCompleteOnPayment(capId) {
	var cap = aa.cap.getCap(capId).getOutput();
	var appTypeResult = cap.getCapType();
	var appTypeString = appTypeResult.toString();
	var ans = lookup("RENEWAL_COMPLETE_ON_PAYMENT", appTypeString);
	if (ans == "TRUE") {
		return true;
	}
	return false;
}


function isRenewProcess(parentCapID, partialCapID) {
	//1. Check to see parent CAP ID is null.
	if (parentCapID == null || partialCapID == null || aa.util.instanceOfString(parentCapID)) {
		return false;
	}
	//2. Get CAPModel by PK for partialCAP.
	var result = aa.cap.getCap(partialCapID);
	if(result.getSuccess()) {
		capScriptModel = result.getOutput();
		//2.1. Check to see if it is partial CAP.	
		if (capScriptModel.isCompleteCap()) {
			logDebug("ERROR: It is not partial CAP(" + capScriptModel.getCapID() + ")");
			return false;
		}
	}
	else {
		logDebug("ERROR: Fail to get CAPModel (" + partialCapID + "): " + result.getErrorMessage());
		return false;
	}
	//3.  Check to see if the renewal was initiated before. 
	result = aa.cap.getProjectByMasterID(parentCapID, "Renewal", "Incomplete");
	if(result.getSuccess()) {
		partialProjects = result.getOutput();
		if (partialProjects != null && partialProjects.length > 0) {
			//Avoid to initiate renewal process multiple times.
			logDebug("Warning: Renewal process was initiated before. ( "+ parentCapID + ")");
			return false;
		}
		
	}
	//4 . Check to see if parent CAP is ready for renew.
	return isReadyRenew(parentCapID);
}


function IsStrInArry(eVal,argArr) {
   	for (x in argArr){
   		if (eVal == argArr[x]){
   			return true;
   		}
 	  }	
	return false;
} 


/**
 * Determine expiration date based on License type and update AltId If AltId
 * can't be updated, assign back to system generated id Get License holder
 * contract and create Reference License Professional Create Specialty
 * Certification Licenses
 * 
 * @example issueNurseSpecialtyLicense();
 * @memberof ASA:LICENSES///APPLICATION
 */

function issueNurseSpecialtyLicense() {
	var licCapId = getParentByCapId(capId);

	try{
		if (licCapId != null) {
			licCapIdString = licCapId.getCustomID();
			licCap = aa.cap.getCap(licCapId).getOutput();
			licAppTypeResult = licCap.getCapType();
			licAppTypeString = licAppTypeResult.toString();
			licAppTypeArray = licAppTypeString.split("/");
			vLicenseType = lookup("LICENSED PROFESSIONAL TYPE LOOKUP", licAppTypeArray[0] + "/" + licAppTypeArray[1] + "/" + licAppTypeArray[2] + "/License");
			logDebug("From amendment found lic cap " + licCapId + " license type " + vLicenseType);
			
			var vLicenseObj = new licenseObject(licCapIdString,licCapId);
		
			
			updateAppNameToContactName("License Holder", licCapId);
			// Get the License Holder Contact
			var licHolderContactObj = getContactObj(licCapId, "License Holder");

			if (vLicenseType == "Registered Nurse") {
				updateRNSpecialtyCertificationTable(capId, licCapId);
				// Create the Specialty Certification Licenses
				var vRegisteredNurseSpecialtyArray = getRegisteredNurseSpecialty("Active", licCapId);

				for (iRn in vRegisteredNurseSpecialtyArray) {
					var vRegisteredNurseSpecialty = vRegisteredNurseSpecialtyArray[iRn]
					
					var licProObjRNS = new licenseProfObject(licCapIdString, vRegisteredNurseSpecialty);
					
					if (!licProObjRNS.valid){
						// Create a License Professional
						licHolderContactObj.createRefLicProf(licCapIdString, vRegisteredNurseSpecialty, "Mailing", LICENSESTATE);
						licProObjRNS = new licenseProfObject(licCapIdString, vRegisteredNurseSpecialty);
						licProObjRNS.refLicModel.setLicenseIssueDate(aa.date.parseDate(dateAdd(null,0)));
					}

					if (licProObjRNS.valid) {
						licProObjRNS.refLicModel.setLicenseExpirationDate(aa.date.parseDate(vLicenseObj.b1ExpDate));
						licProObjRNS.updateRecord();
						// Update the LP, link it to the ref contact and copy it to the record
						licHolderContactObj.linkRefContactWithRefLicProf(licCapIdString, vRegisteredNurseSpecialty);
						licProObjRNS.copyToRecord(licCapId, true);
					}
				}
			}

			updateTask("License Status", "Active", "Updated via issueNurseSpecialtyLicense Script", "", "", licCapId);

			addIssuedLicenseToSet(licCapId);

			sendLicenseIssuedReportNotification(licCapId);
		}
	}
	catch(err){
		logDebug("(issueNurseSpecialtyLicense) A JavaScript Error occured: " + err.message);
	}
}
/**
 * Determine expiration date based on License type and update AltId If AltId
 * can't be updated, assign back to system generated id Get License holder
 * contract and create Reference License Professional Create Specialty
 * Certification Licenses
 * 
 * @example issueProfessionalLicense();
 * @memberof ASA:LICENSES///APPLICATION
 */

function issueProfessionalLicense() {
	var newLicId
	var newLicIdString // AltId
	// select statement to determine expiration date based on license type
	if (arguments.length > 0) {
		newLicId = aa.cap.getCapID(arguments[0]).getOutput()
		newLicIdString = new String(arguments[0])
	}
	newLicId = createParent(appTypeArray[0], appTypeArray[1], appTypeArray[2],
			"License", null);
	newLicIdString = generateAltID(capId);
	var bUpdateAltIDResult = updateAltID(newLicIdString, newLicId);
	if (!bUpdateAltIDResult) {
		// If we were not able to updateAltID then assign back to system
		// generated ID
		newLicIdString = newLicId.getCustomID();
	}

	newLicCap = aa.cap.getCap(newLicId).getOutput();
	var vLicenseType = lookup("LICENSED PROFESSIONAL TYPE LOOKUP",
			appTypeArray[0] + "/" + appTypeArray[1] + "/" + appTypeArray[2]
					+ "/License");

	if (newLicId) {
		copyOwner(capId, newLicId);
		updateAppStatus("Active", "Originally Issued", newLicId);
		updateTask("License Status", "Active", "Updated via Event Script", "",
				newLicId)

		var ignore = lookup("EMSE:ASI Copy Exceptions", appTypeString);
		var ignoreArr = new Array();
		if (ignore != null)
			ignoreArr = ignore.split("|");
		copyAppSpecific(newLicId, ignoreArr);
		copyASITables(capId, newLicId);
		editFirstIssuedDate(sysDateMMDDYYYY, newLicId);
		// if(getIfVeteran()) editAppSpecific("Veteran", "Yes", newLicId);
		changeApplicantToLicenseHolder(newLicId);
		updateAppNameToContactName("License Holder", newLicId);
		// Get the License Holder Contact
		var licHolderContactObj = new getContactObj(newLicId, "License Holder");
		// Using the Contact, create a Reference License Professional
		licHolderContactObj.createRefLicProf(newLicIdString, vLicenseType,
				"Mailing", LICENSESTATE);
		// Get the Reference License Professional we just created
		licProObj = licenseProfObject(newLicIdString, vLicenseType);

		if (licProObj.valid) {
			licProObj.refLicModel.setLicenseIssueDate(newLicCap.getFileDate());
			licProObj.updateRecord()
			licHolderContactObj.linkRefContactWithRefLicProf(newLicIdString,
					vLicenseType);
			licProObj.copyToRecord(newLicId, true);
			licProObj.setPrimary(newLicId, "Y");
		}
		
		if (vLicenseType == "Registered Nurse") {
			updateRNSpecialtyCertificationTable(capId, newLicId);
			// Add the Specialty Certification Licenses

			var licClassifications = getRegisteredNurseSpecialty();
			if (licClassifications != null) {
				for (c in licClassifications) {
					newLPRow = new Array();
					newLPRow["Specialty Certification"] = "" + licClassifications[c];
					newLPRow["Status"] = "Active"
					newLPRow["Start Date"] = "" + sysDateMMDDYYYY;
					newLPRow["End Date"] = "";
					licProObj.addTableRow("NURSE SPECIALTY CERTIFICATION", newLPRow);
				}
				licProObj.setDisplayInACA4Table("NURSE SPECIALTY CERTIFICATION", "Y");
				licProObj.copyToRecord(newLicId, true);
				licProObj.updateRecord();
			}
			else { 
				logDebug("License classification on license record is empty")
			}			
		}

	}

	var thisLic = new licenseObject(newLicIdString, newLicId, vLicenseType);
	var newExpDate = calcExpirationDate(thisLic, newLicId);

	thisLic.setExpiration(newExpDate);
	thisLic.setStatus("Active");

	updateTask("License Status", "Active",
			"Updated via issueProfessionalLicense Script", "", "", newLicId);

	addIssuedLicenseToSet(newLicId);

	sendLicenseIssuedReportNotification(newLicId);

}

function issueTempLicense() {
	var newLicId
	var newLicIdString // AltId
	var currentYear = String(sysDate.getYear());
	var twoDigitYear = currentYear.substring(2,4);
	// select statement to determine expiration date based on license type
	if (arguments.length > 0) {
		newLicId = aa.cap.getCapID(arguments[0]).getOutput()
		newLicIdString = new String(arguments[0])
	}
	newLicId = createChild(appTypeArray[0], appTypeArray[1], appTypeArray[2],"Temporary License", null);		
	newLicIdString = generateAltID(capId) + "TMP" + twoDigitYear;
	// newLicIdString = generateTempAltID(tempId);
	
	var bUpdateAltIDResult = updateAltID(newLicIdString, newLicId);
	if (!bUpdateAltIDResult) {
		// If we were not able to updateAltID then assign back to system
		// generated ID
		newLicIdString = newLicId.getCustomID();
	}

	newLicCap = aa.cap.getCap(newLicId).getOutput();
	var vLicenseType = lookup("LICENSED PROFESSIONAL TYPE LOOKUP",
			appTypeArray[0] + "/" + appTypeArray[1] + "/" + appTypeArray[2] + "/Temporary License");

	if (newLicId) {
		copyOwner(capId, newLicId);
		updateAppStatus("Active", "Originally Issued", newLicId);
		updateTask("License Status", "Active", "Updated via Event Script", "",
				newLicId)

		var ignore = lookup("EMSE:ASI Copy Exceptions", appTypeString);
		var ignoreArr = new Array();
		if (ignore != null)
			ignoreArr = ignore.split("|");
		copyAppSpecific(newLicId, ignoreArr);
		copyASITables(capId, newLicId);
		editFirstIssuedDate(sysDateMMDDYYYY, newLicId);
		// if(getIfVeteran()) editAppSpecific("Veteran", "Yes", newLicId);
		changeApplicantToLicenseHolder(newLicId);
		updateAppNameToContactName("License Holder", newLicId);
		// Get the License Holder Contact
		var licHolderContactObj = new getContactObj(newLicId, "License Holder");
		// Using the Contact, create a Reference License Professional
		licHolderContactObj.createRefLicProf(newLicIdString, vLicenseType,
				"Mailing", LICENSESTATE);
		// Get the Reference License Professional we just created
		licProObj = licenseProfObject(newLicIdString, vLicenseType);

		if (licProObj.valid) {
			licProObj.refLicModel.setLicenseIssueDate(newLicCap.getFileDate());
			licProObj.updateRecord()
			licHolderContactObj.linkRefContactWithRefLicProf(newLicIdString,
					vLicenseType);
			licProObj.copyToRecord(newLicId, true);
			licProObj.setPrimary(newLicId, "Y");
		}

	}

	var thisLic = new licenseObject(newLicIdString, newLicId, vLicenseType);
	var newExpDate = calcExpDate18Months(thisLic, newLicId);

	thisLic.setExpiration(newExpDate);
	thisLic.setStatus("Active");

	updateTask("License Status", "Active",
			"Updated via issueProfessionalLicense Script", "", "", newLicId);

	addIssuedLicenseToSet(newLicId);

	sendLicenseIssuedReportNotification(newLicId);

}


function isTaskStatusBATCH(licNumber, wfstr,wfstat){ // optional process name
	var capId = getApplication(licNumber);
	var useProcess = false;
	var processName = "";
	if (arguments.length > 3) 
		{
		processName = arguments[3]; // subprocess
		useProcess = true;
		}

	if(taskStatus(wfstr, null, capId) == wfstat) {
		return true;
	}	
	else {
		return false;
	}
}

//128-129 (start)

function isTaskStatusFinaled(licNumber, wfTask, wfStatus){ // optional process name ~ getting the lic number and the status of the given related records
	var licenseNumber = licenseProfObject(licNumber);
	if(licenseNumber.getStatus() == wfStatus) {
		logDebug("License is true");
		return true;
	}else {
		logDebug("License is false");
		return false;
	}
}


function isValidContractorLicense(appType,capId) { return (isLicenseType(appType,capId) && isActiveLicense(capId))}


function isWorkflowApproveForReview(capID, wfTask, stepNum, processID, taskStatus) {
	if (capID == null || aa.util.instanceOfString(capID) || stepNum == null || processID == null || wfTask == null || taskStatus == null) {
		return false;
	}
	if (wfTask.length()  == 0) { return false; }
	//1. Get workflow task item
	var result = aa.workflow.getTask(capID, stepNum, processID);
    	if(result.getSuccess()) {
		taskItemScriptModel = result.getOutput();
		if (taskItemScriptModel == null) {
			logDebug("ERROR: Failed to get workflow task with CAPID(" + capID + ") for review");
			return false;
		}
		//2. Check to see if the agency user approve renewal application .
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Renewal Status".equals(wfTask) && ( "Approved".equals(taskStatus) || "Approved Inactive".equals(taskStatus) || "Approved Active".equals(taskStatus)) ) {
			return true;
		}	
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Application Review".equals(wfTask) && ( "Approved".equals(taskStatus) || "Approved - Complete".equals(taskStatus)) ) {
			return true;
		}	
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Issuance".equals(wfTask) && ( "Complete".equals(taskStatus)) ) {
			return true;
		}	

	}  
    	else { logDebug("ERROR: Failed to get workflow task(" + capID + ") for review: " + result.getErrorMessage()); }
	return false;
}


function isWorkflowDenyForReview(capID, wfTask, stepNum, processID, taskStatus) {
	if (capID == null || aa.util.instanceOfString(capID) || stepNum == null || processID == null || wfTask == null || taskStatus == null) {
		return false;
	}
	if (wfTask.length()  == 0) { return false; }
	//1. Get workflow task item
	var result = aa.workflow.getTask(capID, stepNum, processID);
    	if(result.getSuccess()) {
		taskItemScriptModel = result.getOutput();
		if (taskItemScriptModel == null) {
			logDebug("ERROR: Failed to get workflow task with CAPID(" + capID + ") for review");
			return false;
		}
		//2. Check to see if the agency user approve renewal application .
		if (taskItemScriptModel.getTaskDescription().equals(wfTask) && "Renewal Status".equals(wfTask) && "Denied".equals(taskStatus)) {
			return true;
		}	
	}  
    	else { logDebug("ERROR: Failed to get workflow task(" + capID + ") for review: " + result.getErrorMessage()); }
	return false;
}


function licenseProfObjectBCC(licnumber,lictype) 
{
	//Populate the License Model
	this.refLicModel = null;				//Reference LP Model
	this.infoTableGroupCodeObj = null;
	this.infoTableSubGroupCodesObj = null;
	this.infoTables = new Array();			//Table Array ex infoTables[name][row][column].getValue()
	this.attribs = new Array();				//Array of LP Attributes ex attribs[name]
	this.valid = false;						//true if LP is valid
	this.validTables = false;				//true if LP has infoTables
	this.validAttrs = false;				//true if LP has attributes
	
	logDebug("Retrieving LP record for " + aa.getServiceProviderCode() + "," + licnumber)
        if (lictype == "Electrical Fire Alarm Specialty Tech") lictype = "Electrical Fire Alarm Speciality Tech";

	var result = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(), licnumber);
	if (result.getSuccess())
	{
		var tmp = result.getOutput();
		if (lictype == null)
			lictype = "";
		if (tmp != null) {
			logDebug("Temp object is not null");
			for(lic in tmp) {
				tmpLicType = "" + tmp[lic].getLicenseType().toUpperCase();
				if(tmpLicType == lictype.toUpperCase() || lictype == ""){
					this.refLicModel = tmp[lic];
					if(lictype == ""){
						lictype=this.refLicModel.getLicenseType();
					}
					break;
				}
			}
		}
		else { logDebug("tmp object is null"); }
	}
	else {	logDebug("Error retrieving LP record" + result.getErrorMessage());	}
		
	//Get the People Info Tables
	if(this.refLicModel != null)
	{
		this.infoTableGroupCodeObj = this.refLicModel.getInfoTableGroupCodeModel();
		if(this.infoTableGroupCodeObj == null){
			//12ACC-00187
			var infoSvc = aa.licenseProfessional.getLicenseProfessionScriptModel().getOutput();
			if(infoSvc.getInfoTableGroupCodeModel() != null){
				infoSvc.getInfoTableGroupCodeModel().setServProvCode(aa.getServiceProviderCode());
				infoSvc.getInfoTableGroupCodeModel().setCategory(1);
				infoSvc.getInfoTableGroupCodeModel().setReferenceId("");
				infoSvc.getInfoTableGroupCodeModel().setName(lictype.toUpperCase());
				var tmpGrp = aa.licenseProfessional.getRefInfoTableGroupCode(infoSvc).getOutput();
				if(tmpGrp != null){ //If table was found set reference ID and write to DB
					tmpGrp.setReferenceId(this.refLicModel.getLicSeqNbr());
					infoSvc.setInfoTableGroupCodeModel(tmpGrp);
					aa.licenseProfessional.createRefInfoTable(infoSvc);

					//Recapture new data with Table Model
					var tmp = null;
					tmp = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(), licnumber).getOutput();
					for(lic in tmp)
						if(tmp[lic].getLicenseType().toUpperCase() == lictype.toUpperCase()){
							this.refLicModel = tmp[lic];
							break;
						}
					//Get the Table Group Code and continue on
					this.infoTableGroupCodeObj = this.refLicModel.getInfoTableGroupCodeModel();
				}
			}
		}
	}
	
	if(this.infoTableGroupCodeObj != null)
	{
		var tmp = this.infoTableGroupCodeObj.getSubgroups();
		if(tmp != null)
			this.infoTableSubGroupCodesObj = tmp.toArray();
	}
	
	//Set flags that can be used for validation
	this.validTables = (this.infoTableSubGroupCodesObj != null);
	this.valid = (this.refLicModel != null);
	//Get all the Table Values, done this way to keep it clean when a row is added
	//Can also be used to refresh manually
	this.refreshTables = function() {
		if(this.validTables) {	
			for(tbl in this.infoTableSubGroupCodesObj){
				var tableArr = new Array()	
				var columnsList = this.infoTableSubGroupCodesObj[tbl].getColumnDefines();
				if(columnsList != null) 
				{
					columnsList = columnsList.toArray();
					for(column in columnsList)
					{
						var tmpCol = columnsList[column].getTableValues();
						//aa.print(columnsList[column])
						if(tmpCol != null)
						{
							tmpCol = tmpCol.toArray();
							tmpCol.sort(function(a,b){return a.getRowNumber() - b.getRowNumber()})
							//EMSE Dom gets by column, need to pivot to list by row to make usable
							for(var row = 0; row < tmpCol.length; row++)
							{
								tmpCol[row].setRowNumber(row); //Fix the row numbers
								if(tableArr[row] == null)
									tableArr[row] = new Array();
								tableArr[row][columnsList[column].getName()] = tmpCol[row];
							}
						}
					}
				}
				this.infoTables[this.infoTableSubGroupCodesObj[tbl].getName()] = tableArr;
			}
		}
	}
	this.refreshTables(); //Invoke the Table Refresh to popualte our table arrays
		
	//Get max row from table for sequencing
	this.getMaxRowByTable = function(vTableName){
		var maxRow = -1;
		if(this.validTables){
			var tbl = this.infoTables[vTableName];
			if(tbl != null){
				for(row in tbl)
					for(col in tbl[row]) //due to way data is stored must loop through all row/columns
						if(maxRow < parseInt(tbl[row][col].getRowNumber()))
							maxRow = parseInt(tbl[row][col].getRowNumber());
			}
		}
		return maxRow;		
	}
	
	//Add Row to Table
	this.addTableRow = function(vTableName,vValueArray){
		var retVal = false;
		var newRowArray = new Array();
		if(this.validTables)
			for(tbl in this.infoTableSubGroupCodesObj)
				if(this.infoTableSubGroupCodesObj[tbl].getName() == vTableName){
					logDebug("Found table")
					var maxRow = this.getMaxRowByTable(vTableName) + 1;
					var colsArr = this.infoTableSubGroupCodesObj[tbl].getColumnDefines().toArray();
					var colNum = 0;
					colsArr.sort(function(a,b){return (parseInt(a.getDisplayOrder()) - parseInt(b.getDisplayOrder()))});
					for(col in colsArr){
						//12ACC-00189
						var tmpTv = aa.licenseProfessional.getLicenseProfessionScriptModel().getOutput().getInfoTableValueModel();
						tmpTv.setAuditStatus("A");
						tmpTv.setServProvCode(aa.getServiceProviderCode());
						tmpTv.setColumnNumber(colNum++);
						tmpTv.setAuditDate(colsArr[col].getAuditDate()); //need proper date
						if(typeof(currentUserID) != 'undefined') //check to make sure a current userID exists
							tmpTv.setAuditId(currentUserID);
						else
							tmpTv.setAuditId("ADMIN"); //default to admin
						tmpTv.setInfoId(colsArr[col].getId());
						tmpTv.setRowNumber(maxRow); //use static new row variable from object
						for(val in vValueArray)
							if(val.toString().toUpperCase() == colsArr[col].getName().toString().toUpperCase()){
								tmpTv.setValue(vValueArray[val].toString()); //Get Value from associative array
							}					
						
						colsArr[col].addTableValue(tmpTv);
						retVal=true;
					}
					this.refreshTables(); //refresh associative arrays
				}
		return retVal;
	}
	
	//Process an ASIT row into People Info
	this.addTableFromASIT = function(vTableName,vASITArray){
		var retVal = true;
		if(this.validTables)
			for(row in vASITArray){ //for Each Row in the ASIT execute the add
				if(!this.addTableRow(vTableName,vASITArray[row]))
					retVal = false;
			}
		else
			retVal = false;		
		return retVal;
	}
	
	//Remove Row from Table
	this.removeTableRow = function(vTableName,vRowIndex){
		var retVal = false;
		if(this.validTables) {	
			for(tbl in this.infoTableSubGroupCodesObj){
				if(this.infoTableSubGroupCodesObj[tbl].getName() == vTableName){
					var columnsList = this.infoTableSubGroupCodesObj[tbl].getColumnDefines();
					if(columnsList != null) 
					{
						columnsList = columnsList.toArray();
						for(column in columnsList)
						{
							var tmpCol = columnsList[column].getTableValues();
							if(tmpCol != null){
								tmpCol = tmpCol.toArray();
								//aa.print(tmpCol.length);
								if (vRowIndex <= tmpCol.length){
									var tmpList = aa.util.newArrayList()
									for(row in tmpCol){
										if(tmpCol[row].getRowNumber() != vRowIndex){
											tmpList.add(tmpCol[row]);
											//aa.print(tmpCol[row].getColumnNumber() + " :" + tmpCol[row].getRowNumber());
										}
										else{
											retVal = true;
										}
									}
									columnsList[column].setTableValues(tmpList);
								} //End Remove
							} //end column Check
						} //end column loop
					}//end column list check
					break; //exit once table found
				}//end Table loop
			}//end table loop
		}//end table valid check
		
		return retVal;
	}
	
	
	this.removeTable = function(vTableName){
		var retVal = false;
		if(this.validTables) {	
			for(tbl in this.infoTableSubGroupCodesObj){
				if(this.infoTableSubGroupCodesObj[tbl].getName() == vTableName){
					var columnsList = this.infoTableSubGroupCodesObj[tbl].getColumnDefines();
					if(columnsList != null) 
					{
						columnsList = columnsList.toArray();
						for(column in columnsList)
						{
							var tmpCol = columnsList[column].getTableValues();
							if(tmpCol != null){
									var tmpList = aa.util.newArrayList()
									columnsList[column].setTableValues(tmpList);
									retVal = true;
								} //End Remove
						} //end column loop
					}//end column list check
					break; //exit once table found
				}//end Table loop
			}//end table loop
		}//end table valid check
		
		return retVal;
	}
	
	//Enable or Disable Table Row by index
	this.setTableEnabledFlag = function(vTableName,vRowIndex,isEnabled){
		var updated = false
		var tmp = null
		tmp = this.infoTables[vTableName];
		if(tmp != null)
			if(tmp[vRowIndex] != null){
				for(col in tmp[vRowIndex])
				{
					tmp[vRowIndex][col].setAuditStatus(((isEnabled)?"A":"I"));
					updated=true;
				}
			}
		return updated;
	}
	
	//Makes table visible in ACA Lookup
	//vIsVisible = 'Y' or 'N'
	this.setDisplayInACA4Table = function(vTableName, vIsVisible){
		var retVal = false;
		if(this.validTables) {	
			for(tbl in this.infoTableSubGroupCodesObj){
				if(this.infoTableSubGroupCodesObj[tbl].getName() == vTableName){
					var columnsList = this.infoTableSubGroupCodesObj[tbl].getColumnDefines();
					if(columnsList != null) 
					{
						columnsList = columnsList.toArray();
						for(column in columnsList)
						{
							columnsList[column].setDisplayLicVeriForACA(vIsVisible);
							retVal = true;
						} //end column loop
					}//end column list check
					if(retVal){
						var tmpList = aa.util.newArrayList();
						for(col in columnsList){
							tmpList.add(columnsList[col]);
						}
						this.infoTableSubGroupCodesObj[tbl].setColumnDefines(tmpList);
					}
					break; //exit once table found
				}//end Table loop
			}//end table loop
		}//end table valid check
		return retVal;
	}
		
	//Get the Attributes for LP
	if(this.valid){
		var tmpAttrs = this.refLicModel.getAttributes();
		if(tmpAttrs != null){
			var tmpAttrsList = tmpAttrs.values()
			var tmpIterator = tmpAttrsList.iterator();
			if(tmpIterator.hasNext()){
				var tmpAttribs = tmpIterator.next().toArray();
				for(x in tmpAttribs){
					this.attribs[tmpAttribs[x].getAttributeLabel().toUpperCase()] = tmpAttribs[x];
				}
				this.validAttrs = true;
			}
		}		
	}
	
	//get method for Attributes
	this.getAttribute = function (vAttributeName){
		var retVal = null;
		if(this.validAttrs){
			var tmpVal = this.attribs[vAttributeName.toString().toUpperCase()];
			if(tmpVal != null)
				retVal = tmpVal.getAttributeValue();
		}
		return retVal;
	}
	
	//Set method for Attributes
	this.setAttribute = function(vAttributeName,vAttributeValue){
		var retVal = false;
		if(this.validAttrs){
			var tmpVal = this.attribs[vAttributeName.toString().toUpperCase()];
			if(tmpVal != null){
				tmpVal.setAttributeValue(vAttributeValue);
				retVal = true;
			}
		}
		return retVal;
	}
	
	
	
	this.updateLPAddressFromRecordContact = function(vCapId,vContactType,vAddressType) {
		logDebug("In updateLPAddressFromRecordContact");
		this.retVal = false;
		if(this.valid){
			var conArr = new Array();
			var capContResult = aa.people.getCapContactByCapID(vCapId);	
			if (capContResult.getSuccess())
				{ conArr = capContResult.getOutput();  }
			else { retVal = false; }
			
			for(contact in conArr){
				if(vContactType.toString().toUpperCase()==
					conArr[contact].getPeople().getContactType().toString().toUpperCase()
					|| (vContactType.toString() == "" && conArr[contact].getPeople().getFlag() == "Y")){
						
					cont = conArr[contact];
					peop = cont.getPeople();
					addr = peop.getCompactAddress();
					capContactModel = cont.getCapContactModel(); 
					contactAddressListResult = aa.address.getContactAddressListByCapContact(capContactModel);
					if (contactAddressListResult.getSuccess()) { 
						contactAddressList = contactAddressListResult.getOutput();
						foundAddressType = false;
						for (var x in contactAddressList) {
							cal= contactAddressList[x];
							addrType = cal.getAddressType();
							if (addrType == vAddressType) {
								foundAddressType = true;
								contactAddressID = cal.getAddressID();
								cResult = aa.address.getContactAddressByPK(cal.getContactAddressModel());
								if (cResult.getSuccess()) {
									casm = cResult.getOutput(); // contactAddressScriptModel
									//aa.print(casm);
									this.refLicModel.setAddress1(casm.getAddressLine1());
									this.refLicModel.setAddress2(casm.getAddressLine2());
									this.refLicModel.setCity(casm.getCity());
									this.refLicModel.setState(casm.getState());
									this.refLicModel.setZip(casm.getZip());
								}
							}
						}	
					}
					//Audit Fields
					this.refLicModel.setAgencyCode(aa.getServiceProviderCode());
					this.refLicModel.setAuditDate(sysDate);
					this.refLicModel.setAuditID(currentUserID);
					this.refLicModel.setAuditStatus("A");
					
					retVal = true;
					break;
				}
			}
		}
		return retVal;
	}
	
	
	
	
	//Update From Record Contact by Contact Type
	//Uses first contact of type found
	//If contactType == "" then uses primary
	this.updateFromRecordContactByType = function(vCapId,vContactType,vUpdateAddress,vUpdatePhoneEmail){
		this.retVal = false;
		if(this.valid){
			var conArr = new Array();
			var capContResult = aa.people.getCapContactByCapID(vCapId);
			
			if (capContResult.getSuccess())
				{ conArr = capContResult.getOutput();  }
			else { retVal = false; }
			
			for(contact in conArr){
				if(vContactType.toString().toUpperCase()==
					conArr[contact].getPeople().getContactType().toString().toUpperCase()
					|| (vContactType.toString() == "" && conArr[contact].getPeople().getFlag() == "Y")){
						
					cont = conArr[contact];
					peop = cont.getPeople();
					addr = peop.getCompactAddress();
	
					this.refLicModel.setContactFirstName(cont.getFirstName());
					this.refLicModel.setContactMiddleName(peop.getMiddleName());  //get mid from peop
					this.refLicModel.setContactLastName(cont.getLastName());
					this.refLicModel.setBusinessName(peop.getBusinessName());
					if(vUpdateAddress){
						this.refLicModel.setAddress1(addr.getAddressLine1());
						this.refLicModel.setAddress2(addr.getAddressLine2());
						this.refLicModel.setAddress3(addr.getAddressLine3());
						this.refLicModel.setCity(addr.getCity());
						this.refLicModel.setState(addr.getState());
						this.refLicModel.setZip(addr.getZip());
					}
					if(vUpdatePhoneEmail){
						this.refLicModel.setPhone1(peop.getPhone1());
						this.refLicModel.setPhone2(peop.getPhone2());
						this.refLicModel.setPhone3(peop.getPhone3());
						this.refLicModel.setEMailAddress(peop.getEmail());
						this.refLicModel.setFax(peop.getFax());
					}
					//Audit Fields
					this.refLicModel.setAgencyCode(aa.getServiceProviderCode());
					this.refLicModel.setAuditDate(sysDate);
					this.refLicModel.setAuditID(currentUserID);
					this.refLicModel.setAuditStatus("A");
					
					retVal = true;
					break;
				}
			}
		}
		return retVal;
	}
	
	this.updateFromAddress = function(vCapId){
		this.retVal = false;
		if(this.valid){
			var capAddressResult = aa.address.getAddressByCapId(vCapId);
			var addr = null;
			if (capAddressResult.getSuccess()){
				Address = capAddressResult.getOutput();
				for (yy in Address){
					if ("Y"==Address[yy].getPrimaryFlag()){
						addr = Address[yy];
						logDebug("Target CAP has primary address");
						break;
					}
				}
				if(addr == null){
					addr = Address[0];
				}
			}
			else{
				logMessage("**ERROR: Failed to get addresses: " + capAddressResult.getErrorMessage());
			}
			
			if(addr != null){
				var addrLine1 = addr.getAddressLine1();
				if(addrLine1 == null){
					addrLine1 = addr.getHouseNumberStart();
					addrLine1 += (addr.getStreetDirection() != null? " " + addr.getStreetDirection(): "");
					addrLine1 += (addr.getStreetName() != null? " " + addr.getStreetName(): "");
					addrLine1 += (addr.getStreetSuffix() != null? " " + addr.getStreetSuffix(): "");
					addrLine1 += (addr.getUnitType() != null? " " + addr.getUnitType(): "");
					addrLine1 += (addr.getUnitStart() != null? " " + addr.getUnitStart(): "");
				}
				this.refLicModel.setAddress1(addrLine1);
				this.refLicModel.setAddress2(addr.getAddressLine2());
				this.refLicModel.setCity(addr.getCity());
				this.refLicModel.setState(addr.getState());
				this.refLicModel.setZip(addr.getZip());
				retVal = true;
			}
			else{ 
				retVal = false;	
			}
		}
		return retVal;
	}
	
	//Update From Record Licensed Prof
	//License Number and Type must match that of the Record License Prof
	this.updateFromRecordLicensedProf = function(vCapId){
		var retVal = false;
		if(this.valid){
			
			var capLicenseResult = aa.licenseProfessional.getLicenseProf(capId);
			var capLicenseArr = new Array();
			if (capLicenseResult.getSuccess())
				{ capLicenseArr = capLicenseResult.getOutput();  }
			else
				{  retVal = false; }
				
			for(capLic in capLicenseArr){
				if(capLicenseArr[capLic].getLicenseNbr()+"" == this.refLicModel.getStateLicense()+"" 
					&& capLicenseArr[capLic].getLicenseType()+"" == this.refLicModel.getLicenseType()+""){
					
					licProfScriptModel = capLicenseArr[capLic];

					this.refLicModel.setAddress1(licProfScriptModel.getAddress1());
					this.refLicModel.setAddress2(licProfScriptModel.getAddress2());
					this.refLicModel.setAddress3(licProfScriptModel.getAddress3());
					this.refLicModel.setAgencyCode(licProfScriptModel.getAgencyCode());
					this.refLicModel.setAuditDate(licProfScriptModel.getAuditDate());
					this.refLicModel.setAuditID(licProfScriptModel.getAuditID());
					this.refLicModel.setAuditStatus(licProfScriptModel.getAuditStatus());
					this.refLicModel.setBusinessLicense(licProfScriptModel.getBusinessLicense());
					this.refLicModel.setBusinessName(licProfScriptModel.getBusinessName());
					this.refLicModel.setCity(licProfScriptModel.getCity());
					this.refLicModel.setCityCode(licProfScriptModel.getCityCode());
					this.refLicModel.setContactFirstName(licProfScriptModel.getContactFirstName());
					this.refLicModel.setContactLastName(licProfScriptModel.getContactLastName());
					this.refLicModel.setContactMiddleName(licProfScriptModel.getContactMiddleName());
					this.refLicModel.setContryCode(licProfScriptModel.getCountryCode());
					this.refLicModel.setCountry(licProfScriptModel.getCountry());
					this.refLicModel.setEinSs(licProfScriptModel.getEinSs());
					this.refLicModel.setEMailAddress(licProfScriptModel.getEmail());
					this.refLicModel.setFax(licProfScriptModel.getFax());
					this.refLicModel.setLicOrigIssDate(licProfScriptModel.getLicesnseOrigIssueDate());
					this.refLicModel.setPhone1(licProfScriptModel.getPhone1());
					this.refLicModel.setPhone2(licProfScriptModel.getPhone2());
					this.refLicModel.setSelfIns(licProfScriptModel.getSelfIns());
					this.refLicModel.setState(licProfScriptModel.getState());
					this.refLicModel.setLicState(licProfScriptModel.getState());
					this.refLicModel.setSuffixName(licProfScriptModel.getSuffixName());
					this.refLicModel.setWcExempt(licProfScriptModel.getWorkCompExempt());
					this.refLicModel.setZip(licProfScriptModel.getZip());
					
					//new
					this.refLicModel.setFein(licProfScriptModel.getFein());
					//licProfScriptModel.getBirthDate()
					//licProfScriptModel.getTitle()
					this.refLicModel.setPhone3(licProfScriptModel.getPhone3());
					this.refLicModel.setBusinessName2(licProfScriptModel.getBusName2());
					
					retVal = true;
				}
			}
		}
		return retVal;
	}
	
	//Copy Reference Licensed Professional to a Record
	//If replace is true will remove and readd lic_prof
	//Currently wont copy infoTables...
	this.copyToRecord = function(vCapId,vReplace){
		var retVal = false;
		if(this.valid){	
			var capLicenseResult = aa.licenseProfessional.getLicenseProf(vCapId);
			var capLicenseArr = new Array();
			var existing = false;
			if (capLicenseResult.getSuccess())
				{ capLicenseArr = capLicenseResult.getOutput();  }
				
			if(capLicenseArr != null){
				for(capLic in capLicenseArr){
					if(capLicenseArr[capLic].getLicenseNbr()+"" == this.refLicModel.getStateLicense()+"" 
						&& capLicenseArr[capLic].getLicenseType()+"" == this.refLicModel.getLicenseType()+""){
							if(vReplace){
								aa.licenseProfessional.removeLicensedProfessional(capLicenseArr[capLic]);
								break;
							}
							else{
								existing=true;
							}
						}
				}
			}
			
			if(!existing){
				capListResult = aa.licenseScript.associateLpWithCap(vCapId,this.refLicModel);
				retVal = capListResult.getSuccess();
				//Add peopleInfoTables via Workaround (12ACC-00186)
				if(this.validTables && retVal){
					var tmpLicProfObj = aa.licenseProfessional.getLicenseProfessionScriptModel().getOutput();
					this.infoTableGroupCodeObj.setCapId1(vCapId.getID1());
					this.infoTableGroupCodeObj.setCapId2(vCapId.getID2());
					this.infoTableGroupCodeObj.setCapId3(vCapId.getID3());
					//save ref values
					var tmpRefId = this.infoTableGroupCodeObj.getReferenceId();
					var tmpRefType = this.infoTableGroupCodeObj.getReferenceType();
					var tmpRefDesc = this.infoTableGroupCodeObj.getReferenceDesc();
					//update Ref Values
					this.infoTableGroupCodeObj.setReferenceId(this.refLicModel.getStateLicense());
					this.infoTableGroupCodeObj.setReferenceType(this.refLicModel.getLicenseType());
					this.infoTableGroupCodeObj.setReferenceDesc("Description");
					this.infoTableGroupCodeObj.setCategory(1);
					tmpLicProfObj.setInfoTableGroupCodeModel(this.infoTableGroupCodeObj);
					aa.licenseProfessional.createInfoTable(tmpLicProfObj);
					//Set the cap back to null
					this.infoTableGroupCodeObj.setCapId1(null);
					this.infoTableGroupCodeObj.setCapId2(null);
					this.infoTableGroupCodeObj.setCapId3(null);
					//Set the ref values back
					this.infoTableGroupCodeObj.setReferenceId(tmpRefId);
					this.infoTableGroupCodeObj.setReferenceType(tmpRefType);
					this.infoTableGroupCodeObj.setReferenceDesc(tmpRefDesc);
				}
			}
		}
		return retVal;
	}
	
	this.enable = function(){
		this.refLicModel.setAuditStatus("A");
	}
	this.disable = function(){
		this.refLicModel.setAuditStatus("I");
	}
	
	//get records associated to license
	this.getAssociatedRecords = function(){
		var retVal = new Array();
		if(this.valid){
			var resObj = aa.licenseScript.getCapIDsByLicenseModel(this.refLicModel);
			if(resObj.getSuccess()){
				var tmp = resObj.getOutput();
				if(tmp != null) //make sure your not setting to null otherwise will not work like array
					retVal = tmp;
			}
		}
		return retVal;
	}
	
	//Save Changes to this object to Ref Licensed Professional
	this.updateRecord = function(){
		var retVal = false
		if (this.valid)
		{
			//this.refreshTables(); //Must ensure row#s are good or wont show in ACA
			var res = aa.licenseScript.editRefLicenseProf(this.refLicModel);
			retVal = res.getSuccess();
		}
		return retVal;
	}
	

	
	return this	
}
function LPLookupCreateLP(licNumber, licType, licState) {
	var vNewLic = aa.licenseScript.createLicenseScriptModel();
	vNewLic.setAgencyCode(aa.getServiceProviderCode());
	vNewLic.setAuditDate(sysDate);
	//vNewLic.setAuditID(currentUserID);
	vNewLic.setAuditStatus("A");
	vNewLic.setLicenseType(licType);
	vNewLic.setLicState(licState);
	vNewLic.setStateLicense(licNumber);
	createResult = aa.licenseScript.createRefLicenseProf(vNewLic);
	if (createResult.getSuccess()) {
		logDebug("Successfully create LP " + licNumber);
	}
	else 
		logDebug("Error creating LP " + createResult.getErrorMessage());
}


function LPLookupUpdateLP(lObj, licCapId, licType, licState) {
	licCap = aa.cap.getCap(licCapId).getOutput();
	licIDString = licCapId.getCustomID();
	licCapType = licCap.getCapType().toString();
	licCapTypeArr = licCapType.split("/");
	licCapStatus = licCap.getCapStatus();
	lObj.refLicModel.setState(licState);
	lObj.refLicModel.setLicenseBoard(licType);
	lObj.refLicModel.setLicenseIssueDate(licCap.getFileDate());
	
	var expObj = null; var expDt = null; var expObjRes = aa.expiration.getLicensesByCapID(licCapId);
	if(expObjRes.getSuccess()) var expObj = expObjRes.getOutput();
	if (expObj != null) {
		expDt = aa.date.parseDate(expObj.getExpDateString());
		lObj.refLicModel.setLicenseExpirationDate(expDt); //Expiration Date
	} 
	
	if(lObj.updateFromRecordContactByType(licCapId,"License Holder",true,true,"Mailing")) 
		logDebug("Updated from License Holder"); 
	else 
		logDebug("Couldn't Update Contact Info");
	// lObj.refLicModel.setBusinessName2(licCapStatus);

	var licHolderContactObj = getContactObj(licCapId,"License Holder");
	licHolderContactObj.linkRefContactWithRefLicProf(lObj.refLicModel.getStateLicense(),lObj.refLicModel.getLicenseType());
	var lpObjArray = licHolderContactObj.getRelatedRefLicProfObjs();
	
	logDebug("Lic Cap Status: " + licCapStatus + " lpObjArray Size: " + lpObjArray.length);
	
	if (matches(licType, "Electrical Contractor", "Elevator Contractor", "Mechanical Contractor", "Plumbing Contractor", "Plumbing Master")) {
		repCoOrgName = getRepresentingCompanyOrgName(licCapId);
		logDebug("Representing Company Org Name: " + repCoOrgName);
		if (repCoOrgName != null && repCoOrgName != "")
			lObj.refLicModel.setBusinessName(repCoOrgName);
	}
	
	if (lObj.updateRecord()){
		logDebug("LP Updated Successfully");
		lObj.copyToRecord(licCapId,true);
	}
	else
		logDebug("LP Update Failed");
}
function maintainLPLookup() {

	logDebug("Using LICENSESTATE = " + LICENSESTATE + " from EMSE:GlobalFlags"); //Issue State
	var vLicenseType = lookup("LICENSED PROFESSIONAL TYPE LOOKUP", appTypeArray[0] + "/" + appTypeArray[1] + "/" + appTypeArray[2] + "/License");  
	logDebug("License Type to be populated: " + vLicenseType);
	
	licCapId = null; licIDString = null;  licObj = null; licCap = null;
	// Get License CAP
	var searchCap = capId; var tmpId = capId; var prjArr = null;
	
	if (appMatch("*/*/License/NA") || appMatch("*/*/*/License")) {
		var childArr = getChildren("*/*/*/Application");
		if(childArr != null) searchCap = childArr[0];
	}
	capId = tmpId; var vRelationType = "R";
	if(appMatch("*/*/*/Renewal") || appMatch("*/*/Renewal/NA")) vRelationType="Renewal";

	var prjArrRes = aa.cap.getProjectByChildCapID(searchCap,vRelationType,null); 
	if(prjArrRes.getSuccess()) prjArr = prjArrRes.getOutput();
	if (prjArr != null) {
		for(prj in prjArr) {
			if(appMatch("*/*/*/License",prjArr[prj].getProjectID())) licCapId = prjArr[prj].getProjectID();
			if(appMatch("*/*/License/NA",prjArr[prj].getProjectID())) licCapId = prjArr[prj].getProjectID();
		}
	}
	
	if(appMatch("*/*/*/Application")){
		licCapId = getParent();
		if (licCapId != null) {
			licCap = aa.cap.getCap(licCapId).getOutput();
	    	licAppTypeResult = licCap.getCapType();
	    	licAppTypeString = licAppTypeResult.toString();
	    	licAppTypeArray = licAppTypeString.split("/");
	    	logDebug("From Application found lic cap " + licCapId.getCustomID() + " license type " + vLicenseType);
		}
	}
	
	
	logDebug("After search licCapId = " + licCapId);
	logDebug(appMatch("*/Amendment/*/*"));
	if (licCapId == null && (appMatch("*/*/*/License") || appMatch("*/*/License/NA"))) 
		licCapId = capId; //In the event license has no application
	if (appMatch("*/Amendment/*/*")) {
		logDebug("Amendment record")
		licCapId = getParent();
		logDebug("License parent " + licCapId);
		if (licCapId != null) {
			licCap = aa.cap.getCap(licCapId).getOutput();
	    	licAppTypeResult = licCap.getCapType();
	    	licAppTypeString = licAppTypeResult.toString();
	    	licAppTypeArray = licAppTypeString.split("/");
	    	vLicenseType = lookup("LICENSED PROFESSIONAL TYPE LOOKUP", licAppTypeArray[0] + "/" + licAppTypeArray[1] + "/" + licAppTypeArray[2] + "/License");
	    	logDebug("From amendment found lic cap " + licCapId + " license type " + vLicenseType);
		}
	}
	if (licCapId != null) { 
		licCapId = aa.cap.getCapID(licCapId.getID1(),licCapId.getID2(),licCapId.getID3()).getOutput(); 
		licIDString = licCapId.getCustomID();
		logDebug("Got Lic Cap " + licCapId.getCustomID());
	}
	
	licObj = licenseProfObject(licIDString,vLicenseType); //Get LicArray
	var licHolderContactObj =  getContactObj(licCapId,"License Holder");
	logDebug("Got licObj " + licObj + " Valid Status = " + licObj.valid);
	if (!licObj.valid && lookup("LICENSED PROFESSIONAL TYPE",vLicenseType) != null) {
		// We are creating a new Reference License Professional
		
		licHolderContactObj.createRefLicProf(licIDString,vLicenseType,"Mailing",LICENSESTATE);
		
	}
	logDebug(licIDString + ":" + vLicenseType)
	licObj = licenseProfObject(licIDString,vLicenseType);	
	if (licObj.valid) {
		logDebug("Entering LPLookupUpdateLP licObj " + licObj + " licCapId " + licCapId.getCustomID() + " State " + LICENSESTATE);
		LPLookupUpdateLP(licObj, licCapId, vLicenseType, LICENSESTATE);
		
		if (vLicenseType == "Registered Nurse"){
			if (licObj.validTables) {
				logDebug("Updating the LP tables");
				licObj.removeTable("NURSE SPECIALTY CERTIFICATION");
				licObj.refreshTables();
				licClassifications = loadASITable("NURSE SPECIALTY CERTIFICATION", licCapId);
				if (licClassifications != null) {
					for (c in licClassifications) {
						thisRow = licClassifications[c];
						if(thisRow["Status"].fieldValue.equals("Active")){
							newLPRow = new Array();
							newLPRow["Specialty Certification"] = "" + thisRow["Specialty Certification"].fieldValue;
							newLPRow["Status"] = "" + thisRow["Status"].fieldValue;
							newLPRow["Start Date"] = "" + thisRow["Start Date"].fieldValue;
							newLPRow["End Date"] = "" + thisRow["End Date"].fieldValue;
							licObj.addTableRow("NURSE SPECIALTY CERTIFICATION", newLPRow);
						}
					}
					licObj.setDisplayInACA4Table("NURSE SPECIALTY CERTIFICATION", "Y");
					licObj.updateRecord();
				}
				else { 
					logDebug("License classification on license record is empty")
				}
			}
			else {
				logDebug("People info tables in license obejct are not valid");
			}
		}
	}
	else {
		logDebug("LP Not found to update");
	}
}
function numberOfSitesByProjectType(projectType){
 var numberOfSites = 0;
	for (var i = PROJECTTYPE.length - 1; i >= 0; i--) {
		if (PROJECTTYPE[i]["Project Type"] == projectType && parseInt(PROJECTTYPE[i]["No. of Sites"])> 0){
			numberOfSites +=  parseInt(PROJECTTYPE[i]["No. of Sites"]);
		}
	}
	return numberOfSites
}


function prepareAppForRenewal() {
	var partialCapId = getIncompleteCapId();
	var parentCapId = aa.env.getValue("ParentCapID");

	logDebug("Parent Cap id from environment = " + parentCapId);
	//1. Check to see if license is ready for renew
	if (isRenewProcess(parentCapId, partialCapId)) {
		logDebug("CAPID(" + parentCapId + ") is ready for renew. PartialCap (" + partialCapId + ")");
		//2. Associate partial cap with parent CAP.
		var result = aa.cap.createRenewalCap(parentCapId, partialCapId, true);
		if (result.getSuccess()) {
			//3. Copy key information from parent license to partial cap
			copyKeyInfo(parentCapId, partialCapId);
			
			//4. Update Veteran Custom field if contact is a veteran
			if(getIfVeteran(parentCapId)) editAppSpecific("Veteran","Yes",partialCapId);
			if(appMatch("Licenses/Nursing/Registered Nurse/Renewal",partialCapId)) updateRNSpecialtyCertificationTable(partialCapId,parentCapId);
			
			//4. Set B1PERMIT.B1_ACCESS_BY_ACA to "Y" for partial CAP to allow that it is searched by ACA user.
			aa.cap.updateAccessByACA(partialCapId, "Y");
		}
		else { logDebug("ERROR: Associate partial cap with parent CAP. " + result.getErrorMessage()); }
	}
	else { logDebug("This is not renewal process. PartialCapId = " + partialCapId + " ParentCapId = " + parentCapId); }
}

/******************************LIC PROF FUNCTIONS******************************************************/

function prepareAssocatedFormsForPlanReview(){

	var typeArray = new Array();
	
	if (AInfo['Bureau of Construction Codes Plan Review'] == "CHECKED"){
		if (childGetByCapType("PlanReview/Plan Exam/NA/NA",capId)== false) {
			typeArray.push("Plan Exam");
		}
	}
	
	if (AInfo['Bureau of Fire Services Plan Review'] == "CHECKED"){
		if (childGetByCapType("PlanReview/Fire Safety Plan/NA/NA",capId)== false) {
			typeArray.push("Fire Safety Plan");
		}
	}

	if (AInfo['Health Facilities Plan Review'] == "CHECKED"){
		if (childGetByCapType("PlanReview/Health Facilities/NA/NA",capId)== false) {
			typeArray.push("Health Facilities");
		}
	}

	if (AInfo['Barrier Free Design Rule Exception'] == "CHECKED"){
		if (childGetByCapType("PlanReview/Barrier Free Design/NA/NA",capId)== false) {
			typeArray.push("Barrier Free Design");
		}
	}
	
	if (AInfo['MFD Housing Plan Exam & Permit'] == "CHECKED"){
		if (childGetByCapType("PlanReview/MFD Housing Plan Exam/NA/NA",capId)== false) {
			typeArray.push("MFD Housing Plan Exam");
		}
	}

	if (AInfo['Approval of Compliance Assurance'] == "CHECKED"){
		if (childGetByCapType("PlanReview/Compliance Assurance/NA/NA",capId)== false) {
			typeArray.push("Compliance Assurance");
		}
	}

	var capital = AInfo['Estimated Capital Expenditures'];
	var payMethod = AInfo['Payment Method'];
        var pca = AInfo['PCA'];
        var ind = AInfo ['Index'];
        var oc = AInfo['Object Code'];
	
	for (var x in typeArray) {
		var aliasName = "";
		recordType = typeArray[x];
		ctm = aa.proxyInvoker.newInstance("com.accela.aa.aamain.cap.CapTypeModel").getOutput();
		ctm.setGroup("PlanReview");
		ctm.setType(recordType);
		ctm.setSubType("NA");
		ctm.setCategory("NA");
		childId = aa.cap.createSimplePartialRecord(ctm, null, "INCOMPLETE TMP").getOutput();
		aa.cap.createAssociatedFormsHierarchy(capId, childId);			

		//updateWorkDesc(String(workDescGet(capId),childId));
		editAppName(String(aa.cap.getCap(capId).getOutput().getCapModel().getSpecialText()), childId);
		//editAppName(String(aa.cap.getCap(childId).getOutput().getCapType().getAlias()), childId);
		copyAddresses(capId, childId);
		//copyParcels(capId, childId);
		//copyOwners(capId, childId);
		//copyContacts(capId, childId);
		editAppSpecific("Payment Method",payMethod,childId);
		if (recordType = "Health Facilities"){
			editAppSpecific("Estimated Capital Expenditures",capital,childId);
		}
		if (recordType = "Fire Safety Plan"){
			editAppSpecific("Estimated Project Cost",capital,childId);
			editAppSpecific("Estimated Capital Expenditures",capital,childId);
		}
		if (recordType = "Plan Exam"){
			editAppSpecific("Estimated Capital Expenditures",capital,childId);
			editAppSpecific("PCA",pca,childId);
			editAppSpecific("Index",ind,childId);
			editAppSpecific("Object Code",oc,childId);
		}
		//copyASIFields(capId, childId);
	}
}


// per 3/7 discussion - 
// 	if task has been completed, reactivate and update status. 
// 	if task has never been active, don't update
// per 3/22 request - commenting out publicuser criteria

function processDocsForReview() {
// if (publicUser){
	var documents = aa.document.getCapDocumentList(capId,"ADMIN").getOutput();
	var thisCapModel = getIncompleteCapId();
	var wfTasks = aa.workflow.getTasks(capId);
	if (wfTasks.getSuccess){
		var workflowTasks = wfTasks.getOutput();
	}
	
	if(appTypeArray[3] == "Application" && matches(appTypeArray[2], "Registered Nurse", "Licensed Practical Nurse", "Nurse Specialty")){
		 if(documents != null ){	
			for (i in documents){
				var neverActive = false;
				var docCategory = documents[i].getDocCategory();
				logDebug("Doc Category is " + docCategory);
				
				var wfTaskToUpdate = lookup("DOC AR LIC_NURSING_APPLICATION", docCategory);
				
				// if task has never been active, don't update
				if (!isTaskActive(wfTaskToUpdate) && !isTaskComplete(wfTaskToUpdate)){
					neverActive = true;
				}
				
				if (!matches(wfTaskToUpdate, null, "")){
					var alreadyUpdated = false;
					for (i in workflowTasks) {
						var fTaskDes = workflowTasks[i].getTaskDescription();
						var fTaskStatus = workflowTasks[i].getDisposition();
						if (fTaskDes == wfTaskToUpdate && fTaskStatus == "Action Required"){
							alreadyUpdated = true;
						}
					} // task loop
					
					if (!alreadyUpdated){
						if (!neverActive){
							updateTask(wfTaskToUpdate, "Action Required", "Document Received : " + docCategory, "");
							activateTask(wfTaskToUpdate);
						}
					}
				} // task from SC not null
				
			} // doc for loop
		
		} // docs not null
		
	} // Application record type 

	if (appTypeArray[3] == "Renewal" && matches(appTypeArray[2], "Registered Nurse", "Licensed Practical Nurse", "Nurse Specialty")){
		if(documents != null ){
			for (i in documents){
				var neverActive = false;
				var docCategory = documents[i].getDocCategory();
				logDebug("Doc Category is " + docCategory);
				
				var wfTaskToUpdate = lookup("DOC AR LIC_NURSING_RENEW", docCategory);
				
				// if task has never been active, don't update
				if (!isTaskActive(wfTaskToUpdate) && !isTaskComplete(wfTaskToUpdate)){
					neverActive = true;
				}
				
				if (!matches(wfTaskToUpdate, null, "")){
					var alreadyUpdated = false;
					for (i in workflowTasks) {
						var fTaskDes = workflowTasks[i].getTaskDescription();
						var fTaskStatus = workflowTasks[i].getDisposition();
						if (fTaskDes == wfTaskToUpdate && fTaskStatus == "Action Required"){
							alreadyUpdated = true;
						}
					} // task loop
					
					if (!alreadyUpdated){
						if (!neverActive){
							updateTask(wfTaskToUpdate, "Action Required", "Document Received : " + docCategory, "");
							activateTask(wfTaskToUpdate);
						}
					}
				} // task from SC not null
				
			} // for loop
		
		} // docs not null
		
	} // Renewal record type

	if (appTypeArray[2] == "Relicensure"){
		if(documents != null ){
			for (i in documents){
				var neverActive = false;
				var docCategory = documents[i].getDocCategory();
				logDebug("Doc Category is " + docCategory);
				
				var wfTaskToUpdate = lookup("DOC AR LIC_NURSING_RELICENSURE", docCategory);
				
				// if task has never been active, don't update
				if (!isTaskActive(wfTaskToUpdate) && !isTaskComplete(wfTaskToUpdate)){
					neverActive = true;
				}
				
				if (!matches(wfTaskToUpdate, null, "")){
					var alreadyUpdated = false;
					for (i in workflowTasks) {
						var fTaskDes = workflowTasks[i].getTaskDescription();
						var fTaskStatus = workflowTasks[i].getDisposition();
						if (fTaskDes == wfTaskToUpdate && fTaskStatus == "Action Required"){
							alreadyUpdated = true;
						}
					} // task loop
					
					if (!alreadyUpdated){
						if (!neverActive){
							updateTask(wfTaskToUpdate, "Action Required", "Document Received : " + docCategory, "");
							activateTask(wfTaskToUpdate);
						}
					}
				} // task from SC not null
				
			} // for loop
		
		} // docs not null
		
	} // Relicensure record type

	if (appTypeArray[2] == "Reinstatement Reclassification"){
		if(documents != null ){
			for (i in documents){
				var neverActive = false;
				var docCategory = documents[i].getDocCategory();
				logDebug("Doc Category is " + docCategory);
				
				var wfTaskToUpdate = lookup("DOC AR LIC_HEALTH_REINSTATEMENT", docCategory);
				
				// if task has never been active, don't update
				if (!isTaskActive(wfTaskToUpdate) && !isTaskComplete(wfTaskToUpdate)){
					neverActive = true;
				}
				
				if (!matches(wfTaskToUpdate, null, "")){
					var alreadyUpdated = false;
					for (i in workflowTasks) {
						var fTaskDes = workflowTasks[i].getTaskDescription();
						var fTaskStatus = workflowTasks[i].getDisposition();
						if (fTaskDes == wfTaskToUpdate && fTaskStatus == "Action Required"){
							alreadyUpdated = true;
						}
					} // task loop
					
					if (!alreadyUpdated){
						if (!neverActive){
							updateTask(wfTaskToUpdate, "Action Required", "Document Received : " + docCategory, "");
							activateTask(wfTaskToUpdate);
						}
					}
				} // task from SC not null
				
			} // for loop
		
		} // docs not null
		
	} // Reinstatement Reclassification record type

// 		To be added later - Complaint (DOC AR ENF_COMPLAINT) and Enforcement (DOC AR ENF_ENFORCEMENT)

// } // publicUser	

	
}


function processLabelsIssuedASIT(){

var itemCap = capId;
	if (arguments.length >0) itemCap = arguments[1];
	
	var labelControlASIT = new Array();
        labelControlASIT = loadASITable("LABEL CONTROL", itemCap);
		
        for (xx in labelControlASIT) {
			var noOfLabelsRequested = String(labelControlASIT[xx]["No. of Labels Requested"]);
			var beginningLabel = String(labelControlASIT[xx]["Beginning Label Issued"]);
			var endingLabel = String(labelControlASIT[xx]["Ending Label Issued"]);
			var dateIssued = String(labelControlASIT[xx]["Date Issued"]);
			if(noOfLabelsRequested>0 && beginningLabel >0 && endingLabel>0){
				for (kk=beginningLabel;kk<=endingLabel;kk++){
					var  labelIssuedASIT = new Array();
					labelIssuedASIT = loadASITable("LABELS ISSUED", itemCap);
					var labelFound = false;
					for (yy in labelIssuedASIT){
						if(String(labelIssuedASIT[yy]["Label No."]) ==kk +""){
							labelFound =true;
						}
					}

					if(!labelFound){
						var isReadOnly = "N";
						var newLabelsIssuedArray = new Array();
						newLabelsIssuedArray["Label No."] =  new asiTableValObj("Label No.",kk+"",isReadOnly);
						newLabelsIssuedArray["BSAR No."] =  new asiTableValObj("BSAR No.","",isReadOnly); 
						newLabelsIssuedArray["Date Issued"] =  new asiTableValObj("Date Issued",dateIssued,isReadOnly); 
						newLabelsIssuedArray["Date Applied"] =  new asiTableValObj("Date Applied","",isReadOnly);
						newLabelsIssuedArray["Serial No."] =  new asiTableValObj("Serial No.","",isReadOnly);
						newLabelsIssuedArray["Dealer Category"]  = new asiTableValObj("Dealer Category","",isReadOnly);
						newLabelsIssuedArray["Dealer Name"] =  new asiTableValObj("Dealer Name","",isReadOnly);
						newLabelsIssuedArray["Destination"] =  new asiTableValObj("Destination","",isReadOnly);						
						addToASITable("LABELS ISSUED", newLabelsIssuedArray,itemCap);
					}
				}
			}
    }

}


function processRenewalPayment() {
	var capID = getCapId();
	var partialCapID = getPartialCapID(capID);
	logDebug("partialCapID " +  partialCapID);
	var parentLicenseCAPID = getParentLicenseCapID(capID);
	logDebug("Parent CAP ID :" + parentLicenseCAPID);
	if (parentLicenseCAPID != null) {
		logDebug("Parent CAP ID :" + parentLicenseCAPID);
		pLicArray = String(parentLicenseCAPID).split("-");
		var parentLicenseCAPID2 = aa.cap.getCapID(pLicArray[0], pLicArray[1], pLicArray[2]).getOutput();
		logDebug(parentLicenseCAPID2.getCustomID());
		parentLicenseCAPID = parentLicenseCAPID2;
		logDebug("new parent License Cap ID " + parentLicenseCAPID);
		licObject = new licenseObject(parentLicenseCAPID.getCustomID(), parentLicenseCAPID);
		if (licObject.getStatus() == "Active") { 
			logDebug("License record already renewed");
			updateAppStatus("Issued", "set by renewal", parentLicenseCAPID);
			logDebug("License Expiration Code = " + licObject.getCode());
			return;
		}
		
		// 2. Check to see if license is ready for renew, and check for full paying 
		//if (isReadyRenew(parentLicenseCAPID) && isRenewalCap(capID) && (checkFullPaying(capID)=="true")) {
		if (isReadyRenew(parentLicenseCAPID) && isRenewalCap(capID)) {
			if (isRenewalCompleteOnPayment(capID)) {
				//3. Associate current CAP with parent license CAP.
				var result = aa.cap.updateRenewalCapStatus(parentLicenseCAPID, capID);
				if (result.getSuccess()) {
					projectScriptModel = result.getOutput();
					aa.cap.updateAccessByACA(capID, "N");			
					if (projectScriptModel.RENEWAL_COMPLETE.equals(projectScriptModel.getStatus())) {
						if (activeLicense(parentLicenseCAPID)) {
							//copyKeyInfo(capID, parentLicenseCAPID);
							aa.cap.transferRenewCapDocument(partialCapID, parentLicenseCAPID, true);
							logDebug("Transfer document for renew cap. Source Cap: " + partialCapID + ", target Cap:" + parentLicenseCAPID);
		
							//5.1.3. Send auto-issurance license email to public user
						//	if (sendLicEmails) aa.expiration.sendAutoIssueLicenseEmail(parentLicenseCAPID);
						//	logDebug("send auto-issuance license email to citizen user.");
							aa.env.setValue("isAutoIssuanceSuccess", "Yes");
						}
						closeTask("Renewal Status", "Renewal Issued", "set by script", "");
						updateAppStatus("Issued", "set by renewal", parentLicenseCAPID)

						logDebug("CAP(" + parentLicenseCAPID + ") renewal is complete.");
						licObject = new licenseObject(parentLicenseCAPID.getCustomID(), parentLicenseCAPID);
						if (licObject.getCode() == "1 YR ISSUE") {
							oldExpDate = licObject.refProf.getLicenseExpirationDate();
							oldExpDateStr = oldExpDate.getMonth() + "/" + oldExpDate.getDayOfMonth() + "/" + oldExpDate.getYear();
							licObject.setExpiration(dateAddMonths(oldExpDateStr, 12));
						}



					}
					else {
						//Send new license application notice agency user for approval
					//	if (sendLicEmails) aa.expiration.sendNoAutoIssueLicenseEmail(parentLicenseCAPID);
					//	logDebug("send no-auto-issuance license email to citizen user and agency user.");
						logDebug("CAP(" + parentLicenseCAPID + ") is ready for review.");
					}
				}	
				else { logDebug("ERROR: Failed to create renewal CAP : MasterCAP(. " + parentLicenseCAPID + ")  renewal CAP(" + capID + ")" + result.getErrorMessage()); }
			}
			else {
				var reviewResult = aa.cap.getProjectByChildCapID(capID, "Renewal", "Incomplete");
				if(reviewResult.getSuccess()) {
					projectScriptModels = reviewResult.getOutput();
					projectScriptModel = projectScriptModels[0];
					projectScriptModel.setStatus("Review");
					var updateResult = aa.cap.updateProject(projectScriptModel);
					if (updateResult.getSuccess()) {
						logDebug("Updated project status to review");
					}
					else { logDebug("Error updating project status to review: " + updateResult.getErrorMessage()); }
				}
				else { logDebug("Error getting Project By Child CapID"); }
			}
		}
	}
	else { logDebug("Parent CapID is null"); }
}

function putRecordOnHoldIfLPNotIssued(){
	var capLps = getLicenseProfessional(capId);
	for (var thisCapLpNum in capLps){
		var licNumber = capLps[thisCapLpNum].getLicenseNbr();
		if(licNumber != null && licNumber != ""){
			var licCapId = getApplication(licNumber);
		}
		if(licCapId != null && licCapId != ""){
			var capResult = aa.cap.getCap(licCapId);
			if (capResult.getSuccess()) {
				licCap = capResult.getOutput();
				if (licCap != null) {
					licStatus = licCap.getCapStatus();
					logDebug("License status is " + licStatus);
				}
			}
		}
		if(licStatus != "Issued"){
			addAppCondition("Building Holds", "Applied", "License Professional - Not Issued", "The Licensed Professional added is not in 'Issued' status", "Hold");
			return true;
		} else {
			return false;
		}
	}
}

function reIssueLicense(licNum) {

	licCapIdResult = aa.cap.getCapID(licNum);
	if (licCapIdResult.getSuccess()) {
		licCapId = licCapIdResult.getOutput();

		// add this application to the parent license
		linkResult = aa.cap.createAppHierarchy(licCapId, capId);
		if (linkResult.getSuccess()) {
			thisLic = new licenseObject(licCapId.getCustomID(), licCapId);
			thisLic.setStatus("Active");
			updateAppStatus("Issued", "Set by reissue script", licCapId);
			// remove all current contacts
			capContactResult = aa.people.getCapContactByCapID(licCapId);
			if (capContactResult.getSuccess()) {
				Contacts = capContactResult.getOutput();
				for (yy in Contacts) {
					var oldContact = Contacts[yy].getCapContactModel();
					aa.people.removeCapContact(licCapId,oldContact.getContactSeqNumber());	
				}
			}	
			// copy the contacts from this application to the license
			copyContacts(capId, licCapId);
			changeApplicantToLicenseHolder(licCapId);
		}
		else { logDebug("Error linking to license : " + linkResult.getErrorMessage()); }
	}
	else { logDebug("Error getting license cap : " + licCapIdResult.getErrorMessage()); }
}	


function removeCommas(str) {
	//This function removes all commas from a string value passed as a parameter (such as a number entered by a user with commas when code is expecting only numbers passed).
    while (str.search(",") >= 0) {
        str = (str + "").replace(',', '');
    }
    return str;
}
function removeExistingReleations(itemCap)
{
   // remove the parents from the caps !

   getCapResult = aa.cap.getProjectParents(itemCap, 0);
   if (getCapResult.getSuccess())
   {
      parentArray = getCapResult.getOutput();
	  for( i=0;i<parentArray.length;i++){
		  var linkResult = aa.cap.removeAppHierarchy(parentArray[i].getCapID(), itemCap);
		  if (linkResult.getSuccess())
			logDebug("Successfully removed from Parent Application : " + parentArray[i].getCapID().getCustomID());
		else
			logDebug( "**ERROR: removing from parent application parent cap id (" + parentArray[i].getCapID().getCustomID() + "): " + linkResult.getErrorMessage());
	  }
   }
}


function renewProfessionalLicense() {
	
	var vLicenseType = lookup("LICENSED PROFESSIONAL TYPE LOOKUP", appTypeArray[0] + "/" + appTypeArray[1] + "/" + appTypeArray[2] + "/License"); 
    var newLicId = getParentLicenseCapID(capId);
	var newLicIdString = newLicId.getCustomID();
	
	if (arguments.length > 0){
		newLicId = aa.cap.getCapID(arguments[0].getCustomID()).getOutput()
		newLicIdString = arguments[0].getCustomID();
		//var thisCapId = aa.cap.getCapID(licNbr).getOutput();
	}
		
		thisLic = new licenseObject(newLicIdString,newLicId,vLicenseType) ;
		var newExpDate;
		
		// Get the expiration Date
		newExpDate = calcExpirationDate(thisLic,newLicId);
		
        thisLic.setExpiration(newExpDate);
		

		// select statement to update expiration status based on ASI
		
		thisLic.setStatus("Active");
		updateTask("License Status","Active","Updated via EMSE Script from " + newLicIdString , "","",newLicId);
		updateAppStatus("Active","Updated via EMSE Script from " + newLicIdString, newLicId);
		updateAppNameToContactName("License Holder",newLicId);
		
        switch (String(appTypeString))  {
			case "Licenses/Nursing/Registered Nurse/Renewal" :
				updateRNSpecialtyCertificationTable(capId,newLicId);
			break;
        }	
}

/***********************************RENEWAL FUNCTIONS***************************************************/

function sendAdditionalInfoRequiredNotification(){
	
var itemCapId = capId;
if (arguments.length == 1) itemCapId = arguments[0]; // use cap ID specified in args
//acaURL located in INCLUDES_CUSTOM_GLOBALS

var itemCapIDString = itemCapId.getCustomID();
var itemCap = aa.cap.getCap(itemCapId).getOutput();
var itemCapTypeAlias = itemCap.getCapType().getAlias();

var invokingEvent = aa.env.getValue("EventName");
	
// Provide the ACA URl - This should be set in INCLUDES_CUSTOM_GLOBALS
if(matches(acaURL,null,undefined,"")) var acaURL = "acasupp3.accela.com/milara";
// Provide the Agency Reply Email - This should be set in INCLUDES_CUSTOM_GLOBALS
if(matches(agencyReplyEmail,null,undefined,"")) var agencyReplyEmail = "LARA-BPL-TEST@michigan.gov";
// Provide the contact types to send this notification
var contactTypesArray = new Array("Applicant", "License Holder");
// Provide the Notification Template to use
var notificationTemplate = "MILARA_ADDITIONTAL_INFO_REQUIRED";
// Provide the name of the report from Report Manager
var reportName = "Pending Document Conditions";
// Get an array of Contact Objects using Master Scripts 3.0
var contactObjArray = getContactObjs(itemCapId,contactTypesArray);
// Set the report parameters. For Ad Hoc use p1Value, p2Value etc.
var rptParams = aa.util.newHashMap();
//rptParams.put("serviceProviderCode",servProvCode);
rptParams.put("p1Value", capIDString);

if(!matches(reportName,null,undefined,"")){
// Call runReportAttach to attach the report to Documents Tab
var attachResults = runReportAttach(itemCapId,reportName,"p1Value",itemCapIDString);
}

for (iCon in contactObjArray) {

	var tContactObj = contactObjArray[iCon];
	logDebug("ContactName: " + tContactObj.people.getFirstName() + " " + tContactObj.people.getLastName());
	if (!matches(tContactObj.people.getEmail(),null,undefined,"")) {
		logDebug("Contact Email: " + tContactObj.people.getEmail());
		var eParams = aa.util.newHashtable();
		addParameter(eParams, "$$recordTypeAlias$$", itemCapTypeAlias);
		getRecordParams4Notification(eParams);
		getACARecordParam4Notification(eParams,acaURL);
		tContactObj.getEmailTemplateParams(eParams,"Contact");
		getAppConditions(eParams,"License Required Documents","Pending",null,"Required");
		getWorkflowParams4Notification(eParams);
		//getInspectionResultParams4Notification(eParams);
		//getPrimaryAddressLineParam4Notification(eParams);
		if(!matches(reportName,null,undefined,"")){
			// Call runReport4Email to generate the report and send the email
			runReport4Email(itemCapId,reportName,tContactObj,rptParams,eParams,notificationTemplate,itemCap.getCapModel().getModuleName(),agencyReplyEmail);	
		}
		else{
			// Call sendNotification if you are not using a report
			sendNotification(agencyReplyEmail,tContactObj.people.getEmail(),"",notificationTemplate ,eParams,null,itemCapId);
		}
	}

}
}
function sendConditionAddedNotification(){
	//acaURL located in INCLUDES_CUSTOM_GLOBALS
	
	// Provide the Agency Reply Email - This should be set in INCLUDES_CUSTOM_GLOBALS
	var agencyReplyEmail = "noreply@accela.com"
	// Provide the contact types to send this notification
	var contactTypesArray = new Array("Applicant", "License Holder");
	// Provide the Notification Template to use
	var notificationTemplate = "CONDITION PLACED ON APPLICATION";
 

	// Get an array of Contact Objects using Master Scripts 3.0
	var contactObjArray = getContactObjs(capId,contactTypesArray);

	for (iCon in contactObjArray) {
		var tContactObj = contactObjArray[iCon];
		logDebug("ContactName: " + tContactObj.people.getFirstName() + " " + tContactObj.people.getLastName());
		if (!matches(tContactObj.people.getEmail(),null,undefined,"")) {
			logDebug("Contact Email: " + tContactObj.people.getEmail());
			var eParams = aa.util.newHashtable();
			addParameter(eParams, "$$recordTypeAlias$$", cap.getCapType().getAlias());
			getRecordParams4Notification(eParams);
			getACARecordParam4Notification(eParams,acaURL);
			tContactObj.getEmailTemplateParams(eParams);
			//getWorkflowParams4Notification(eParams);
			//getInspectionResultParams4Notification(eParams);
			getPrimaryAddressLineParam4Notification(eParams);
			getContactParams4Notification(eParams,"Applicant");
			getContactParams4Notification(eParams,"License Holder");
			// Call sendNotification if you are not using a report
			sendNotification(agencyReplyEmail,tContactObj.people.getEmail(),"",notificationTemplate ,eParams,null);
		}
	}
}
function sendLicenseIssuedReportNotification(){
	
var itemCapId = capId;
if (arguments.length == 1) itemCapId = arguments[0]; // use cap ID specified in args
//acaURL located in INCLUDES_CUSTOM_GLOBALS

var itemCapIDString = itemCapId.getCustomID();
var itemCap = aa.cap.getCap(itemCapId).getOutput();
var itemCapTypeAlias = itemCap.getCapType().getAlias();

var invokingEvent = aa.env.getValue("EventName");

// Provide the ACA URl - This should be set in INCLUDES_CUSTOM_GLOBALS
if(matches(acaURL,null,undefined,"")) var acaURL = "acasupp3.accela.com/milara";
// Provide the Agency Reply Email - This should be set in INCLUDES_CUSTOM_GLOBALS
if(matches(agencyReplyEmail,null,undefined,"")) var agencyReplyEmail = "LARA-BPL-TEST@michigan.gov";
// Provide the contact types to send this notification


// Provide the contact types to send this notification
var contactTypesArray = new Array("License Holder");

if(appMatch("Licenses/*/*/*", itemCapId)){
	// Provide the Notification Template to use
	var notificationTemplate = "MILARA_LICENSE_ISSUED_REPORT";
	// Provide the name of the report from Report Manager
	var reportName = "";
} 

// Get an array of Contact Objects using Master Scripts 3.0
var contactObjArray = getContactObjs(itemCapId,contactTypesArray);
// Set the report parameters. For Ad Hoc use p1Value, p2Value etc.
var rptParams = aa.util.newHashMap();

rptParams.put("altID",itemCapIDString);

if(!matches(reportName,null,undefined,"")){
	// Call runReportAttach to attach the report to Documents Tab
	var attachResults = runReportAttach(itemCapId,reportName,"altID",itemCapIDString);
}

for (iCon in contactObjArray) {
	var tContactObj = contactObjArray[iCon];
	
	if (!matches(tContactObj.people.getEmail(),null,undefined,"")) {
		var eParams = aa.util.newHashtable();
		addParameter(eParams, "$$recordTypeAlias$$", itemCapTypeAlias);
		getRecordParams4Notification(eParams);
		getACARecordParam4Notification(eParams,acaURL);
		tContactObj.getEmailTemplateParams(eParams);
		if (invokingEvent == "WorkflowTaskUpdateAfter") getWorkflowParams4Notification(eParams);
		if (invokingEvent == "InspectionResultSubmitAfter") getInspectionResultParams4Notification(eParams);
		// getPrimaryAddressLineParam4Notification(eParams);

		if(!matches(reportName,null,undefined,"")){
			// Call runReport4Email to generate the report and send the email
			runReport4Email(itemCapId,reportName,tContactObj,rptParams,eParams,notificationTemplate,itemCap.getCapModel().getModuleName(),agencyReplyEmail);
			// runReport4EmailOrPrint(itemCap,reportName,tContactObj,rptParams,eParams,notificationTemplate,itemCap.getCapModel().getModuleName())
		}
		else{
			// Call sendNotification if you are not using a report
			sendNotification(agencyReplyEmail,tContactObj.people.getEmail(),"",notificationTemplate ,eParams,null,itemCapId);
		}
	}
}

}
 function sendNotification(emailFrom,emailTo,emailCC,templateName,params,reportFile)
{
	var itemCap = capId;
	if (arguments.length == 7) itemCap = arguments[6]; // use cap ID specified in args

	var id1 = itemCap.ID1;
 	var id2 = itemCap.ID2;
 	var id3 = itemCap.ID3;
	var capIDScriptModel = aa.cap.createCapIDScriptModel(id1, id2, id3);
	var result = null;

	result = aa.document.sendEmailAndSaveAsDocument(emailFrom, emailTo, emailCC, templateName, params, capIDScriptModel, reportFile);

	if(result.getSuccess())

	{
		logDebug("Sent email successfully!");
		return true;
	}
	else
	{
		logDebug("Failed to send mail. - " + result.getErrorType());
		return false;
	}
}

function sendPermitInvoiceReportNotification(){
	//acaURL located in INCLUDES_CUSTOM_GLOBALS
	
	// Provide the Agency Reply Email - This should be set in INCLUDES_CUSTOM_GLOBALS
	var agencyReplyEmail = "noreply@accela.com"
	// Provide the contact types to send this notification
	var contactTypesArray = new Array("Applicant");

	if(appMatch("Building/*/*/*")){
		// Provide the Notification Template to use
		var notificationTemplate = "MESSAGE_PERMIT_INVOICE_REPORT";
	} 
	
	// Provide the name of the report from Report Manager
	if(appMatch("Building/Building/*/*")){
		var reportName = "Building Invoice";
	} else if(appMatch("Building/Mechanical/*/*")){
		var reportName = "Permit - Invoice Elec_Mech_Plumb";
	} else if(appMatch("Building/Plumbing/*/*")){
		var reportName = "Permit - Invoice Elec_Mech_Plumb";
	} else if(appMatch("Building/Electrical/*/*")){
		var reportName = "Permit - Invoice Elec_Mech_Plumb";
	}

	// Get an array of Contact Objects using Master Scripts 3.0
	var contactObjArray = getContactObjs(capId,contactTypesArray);
	// Set the report parameters. For Ad Hoc use p1Value, p2Value etc.
	var rptParams = aa.util.newHashMap();
	var applicationNum = capId.getCustomID();
	rptParams.put("altID",applicationNum);

	if(!matches(reportName,null,undefined,"")){
		// Call runReportAttach to attach the report to Documents Tab
		var attachResults = runReportAttach(capId,reportName,"altID",applicationNum);
	}

	for (iCon in contactObjArray) {
		var tContactObj = contactObjArray[iCon];
		logDebug("ContactName: " + tContactObj.people.getFirstName() + " " + tContactObj.people.getLastName());
		if (!matches(tContactObj.people.getEmail(),null,undefined,"")) {
			logDebug("Contact Email: " + tContactObj.people.getEmail());
			var eParams = aa.util.newHashtable();
			addParameter(eParams, "$$recordTypeAlias$$", cap.getCapType().getAlias());
			addParameter(eParams, "$$ApplicantFirstName$$", tContactObj.people.getFirstName());
			addParameter(eParams, "$$ApplicantLastName$$", tContactObj.people.getLastName());
			getRecordParams4Notification(eParams);
			//getACARecordParam4Notification(eParams,acaURL);
			tContactObj.getEmailTemplateParams(eParams);
			//getWorkflowParams4Notification(eParams);
			//getInspectionResultParams4Notification(eParams);
			getPrimaryAddressLineParam4Notification(eParams);
			if(!matches(reportName,null,undefined,"")){
				// Call runReport4Email to generate the report and send the email
				runReport4Email(capId,reportName,tContactObj,rptParams,eParams,notificationTemplate,"Building",agencyReplyEmail);	
			}
			else{
				// Call sendNotification if you are not using a report
				sendNotification(agencyReplyEmail,tContactObj.people.getEmail(),"",notificationTemplate ,eParams,null);
			}
		}
	}
}
function sendPermitIssuedReportNotification(){
	//acaURL located in INCLUDES_CUSTOM_GLOBALS
	
	// Provide the Agency Reply Email - This should be set in INCLUDES_CUSTOM_GLOBALS
	var agencyReplyEmail = "noreply@accela.com"
	// Provide the contact types to send this notification
	var contactTypesArray = new Array("Applicant");

	if(appMatch("Building/*/*/*")){
		// Provide the Notification Template to use
		var notificationTemplate = "MESSAGE_PERMIT_ISSUED_REPORT";
	} 
	
	// Provide the name of the report from Report Manager
	if(appMatch("Building/Electrical/NA/NA")){
		var reportName = "Issued - Elec Mech Plumb";
	} else if(appMatch("Building/Mechanical/NA/NA")){
		var reportName = "Issued - Elec Mech Plumb";
	} else if(appMatch("Building/Plumbing/NA/NA")){
		var reportName = "Issued - Elec Mech Plumb";
	} else if(appMatch("Building/Building/NA/NA")){
		var reportName = "Building Permit Issued";
	} else if(appMatch("Building/Boiler/NA/NA")){
		var reportName = "Boiler Permit Issued";
	}

	// Get an array of Contact Objects using Master Scripts 3.0
	var contactObjArray = getContactObjs(capId,contactTypesArray);
	// Set the report parameters. For Ad Hoc use p1Value, p2Value etc.
	var rptParams = aa.util.newHashMap();
	var licenseNum = capId.getCustomID();
	rptParams.put("altID",licenseNum);

	if(!matches(reportName,null,undefined,"")){
		// Call runReportAttach to attach the report to Documents Tab
		var attachResults = runReportAttach(capId,reportName,"altID",licenseNum);
	}

	for (iCon in contactObjArray) {
		var tContactObj = contactObjArray[iCon];
		logDebug("ContactName: " + tContactObj.people.getFirstName() + " " + tContactObj.people.getLastName());
		if (!matches(tContactObj.people.getEmail(),null,undefined,"")) {
			logDebug("Contact Email: " + tContactObj.people.getEmail());
			var eParams = aa.util.newHashtable();
			addParameter(eParams, "$$recordTypeAlias$$", cap.getCapType().getAlias());
			getRecordParams4Notification(eParams);
			getACARecordParam4Notification(eParams,acaURL);
			tContactObj.getEmailTemplateParams(eParams);
			getContactParams4Notification(eParams, 'Applicant');
			getWorkflowParams4Notification(eParams);
			//getInspectionResultParams4Notification(eParams);
			getPrimaryAddressLineParam4Notification(eParams);
			if(!matches(reportName,null,undefined,"")){
				// Call runReport4Email to generate the report and send the email
				runReport4Email(capId,reportName,tContactObj,rptParams,eParams,notificationTemplate,cap.getCapModel().getModuleName(),agencyReplyEmail);	
			}
			else{
				// Call sendNotification if you are not using a report
				sendNotification(agencyReplyEmail,tContactObj.people.getEmail(),"",notificationTemplate ,eParams,null);
			}
		}
	}
}
function sendRenewalNoticeNotification(){
	
var itemCapId = capId;
if (arguments.length == 1) itemCapId = arguments[0]; // use cap ID specified in args
//acaURL located in INCLUDES_CUSTOM_GLOBALS

var itemCapIDString = itemCapId.getCustomID();
var itemCap = aa.cap.getCap(itemCapId).getOutput();
var itemCapTypeAlias = itemCap.getCapType().getAlias();

var invokingEvent = aa.env.getValue("EventName");
	
// Provide the ACA URl - This should be set in INCLUDES_CUSTOM_GLOBALS
if(matches(acaURL,null,undefined,"")) var acaURL = "acasupp3.accela.com/milara";
// Provide the Agency Reply Email - This should be set in INCLUDES_CUSTOM_GLOBALS
if(matches(agencyReplyEmail,null,undefined,"")) var agencyReplyEmail = "LARA-BPL-TEST@michigan.gov";

// Provide the contact types to send this notification
var contactTypesArray = new Array("Applicant", "License Holder");

// Get an array of Contact Objects using Master Scripts 3.0
var contactObjArray = getContactObjs(itemCapId,contactTypesArray);

// Provide the Notification Template to use
var notificationTemplate = "MILARA_ADDITIONTAL_INFO_REQUIRED";

// Provide the name of the report from Report Manager
var reportName = "Renewal Notice";

// Set the report parameters. For Ad Hoc use p1Value, p2Value etc.
var rptParams = aa.util.newHashMap();
//rptParams.put("serviceProviderCode",servProvCode);
rptParams.put("p1Value", capIDString);

if(!matches(reportName,null,undefined,"")){
// Call runReportAttach to attach the report to Documents Tab
var attachResults = runReportAttach(itemCapId,reportName,"p1Value",itemCapIDString);
}

for (iCon in contactObjArray) {

	var tContactObj = contactObjArray[iCon];
	logDebug("ContactName: " + tContactObj.people.getFirstName() + " " + tContactObj.people.getLastName());
	if (!matches(tContactObj.people.getEmail(),null,undefined,"")) {
		logDebug("Contact Email: " + tContactObj.people.getEmail());
		var eParams = aa.util.newHashtable();
		addParameter(eParams, "$$recordTypeAlias$$", itemCapTypeAlias);
		getRecordParams4Notification(eParams);
		getACARecordParam4Notification(eParams,acaURL);
		tContactObj.getEmailTemplateParams(eParams,"Contact");
		getAppConditions(eParams,"License Required Documents","Pending",null,"Required");
		getWorkflowParams4Notification(eParams);
		//getInspectionResultParams4Notification(eParams);
		//getPrimaryAddressLineParam4Notification(eParams);
		if(!matches(reportName,null,undefined,"")){
			// Call runReport4Email to generate the report and send the email
			runReport4Email(itemCapId,reportName,tContactObj,rptParams,eParams,notificationTemplate,itemCap.getCapModel().getModuleName(),agencyReplyEmail);	
		}
		else{
			// Call sendNotification if you are not using a report
			sendNotification(agencyReplyEmail,tContactObj.people.getEmail(),"",notificationTemplate ,eParams,null,itemCapId);
		}
	}

}
}
function setAllRecordConditionDisplayNoticeForAAAndACA(){
	var licNumber = capId.getCustomID();
	var conditions = aa.capCondition.getCapConditions(getApplication(licNumber)).getOutput();
	for(con in conditions){
		thisCondition = conditions[con];
		logDebug("There is a condition - DisplayNoticeAA: " + thisCondition.getDisplayConditionNotice() + " | DisplayNoticeACA: " + thisCondition.getDisplayNoticeOnACA());
		thisCondition.setDisplayConditionNotice("Y");
		thisCondition.setDisplayNoticeOnACA("Y");
		aa.capCondition.editCapCondition(thisCondition);
		logDebug("There is a condition - DisplayNoticeAA: " + thisCondition.getDisplayConditionNotice() + " | DisplayNoticeACA: " + thisCondition.getDisplayNoticeOnACA());
	}
}

function setInitialWorkflowTaskStatus() {
	var vWFComment = "Updated via EMSE Script"
	
	if(vEventName == "ConvertToRealCAPAfter"){
	
	}
	if(vEventName == "WorkflowTaskUpdateAfter"){
	
		if (wfProcess == "LIC_NURSING_APPLICATION" && wfTask == "Application Intake" && wfStatus == "Accepted") {
			
			updateTask("Application Review","Ready for Application Review",vWFComment,"");
			updateTask("Examination Status","Exam Determination",vWFComment,"");
			updateTask("Background Review","Pending Fingerprints",vWFComment,"");
		}
		if (wfProcess == "LIC_NURSING_RENEW" && wfTask == "Renewal Intake" && wfStatus == "Accepted") {
			updateTask("Renewal Review","Ready for Renewal Review",vWFComment,"");
		}
		
		if (wfTask == "Reinstatement Intake" && wfStatus == "Accepted"){
			updateTask("Background Review","Pending Fingerprints",vWFComment,"");
			updateTask("Reinstatement Review","Ready for Reinstatement Review",vWFComment,"");
		}
		
		if (wfTask == "Relicensure Intake" && wfStatus == "Accepted"){
			updateTask("Background Review","Pending Fingerprints",vWFComment,"");
			updateTask("Examination Status","Exam Determination",vWFComment,"");
			updateTask("Relicensure Review","Ready for Relicensure Review",vWFComment,"");
		}

	}
		
}
function setInitialWorkflowTaskStatusACA() {
	var vWFComment = "Updated via EMSE Script";
	
	if (publicUser){
		
		if(appTypeArray[3] == "Application"){
			closeTask("Application Intake","Accepted",vWFComment,"");
			updateTask("Application Review","Ready for Application Review",vWFComment,"");
			updateTask("Examination Status","Exam Determination",vWFComment,"");
			updateTask("Background Review","Pending Fingerprints",vWFComment,"");
		}
		/* Renewal is handled in CTRCA;LICENSES!NURSING!~!RENEWAL
		if (appTypeArray[3] == "Renewal") {
			closeTask("Renewal Intake","Accepted",vWFComment,"");
			updateTask("Renewal Review","Ready for Renewal Review",vWFComment,"");
		} */
		
		if (appTypeArray[2] == "Reinstatement Reclassification"){
			closeTask("Reinstatement Intake","Accepted",vWFComment,"");
			updateTask("Background Review","Pending Fingerprints",vWFComment,"");
			updateTask("Reinstatement Review","Ready for Reinstatement Review",vWFComment,"");
		}
		
		if (appTypeArray[2] == "Relicensure"){
			closeTask("Relicensure Intake","Accepted",vWFComment,"");
			updateTask("Background Review","Pending Fingerprints",vWFComment,"");
			updateTask("Examination Status","Exam Determination",vWFComment,"");
			updateTask("Relicensure Review","Ready for Relicensure Review",vWFComment,"");
		}
	}
		
}
function setPrimaryContactToApplicant(itemCap) {
	primContactType = "Applicant";

	var conObj = getContactObj(itemCap,primContactType);

	if (conObj) {
		conObj.primary = "Y";
		conObj.save();	
	}	
}
function sumASITColumn(tObj, cNameToSum) { // tObj = variable for loadASITable(), cNameToSum = ASIT column name to sum
	// optional params = cFilterType, cNameFilter, cValueFilter, cFilterType2, cNameFilter2, cValueFilter2
	var retValue = 0;
	if (tObj) {
		if (arguments.length == 2) { // no filters
			for (var ea in tObj) {
				var row = tObj[ea];
				var colValue = row[cNameToSum].fieldValue;
				if (!isNaN(parseFloat(colValue))) 
					retValue += parseFloat(colValue);
			}
			return retValue;
		}
		if (arguments.length == 5) { // evaluate 1 column
			filterType = arguments[2];
			cNameFilter = arguments[3];
			cValueFilter = arguments[4];
			for (var ea in tObj) {
				var row = tObj[ea];
				var colValue = row[cNameToSum].fieldValue;
				var colFilter = row[cNameFilter].fieldValue;
				if (filterType == "INCLUDE") {
					if (colFilter == cValueFilter) {
						if (!isNaN(parseFloat(colValue))) 
							retValue += parseFloat(colValue);
					}
				}
				if (filterType == "EXCLUDE") {
					if (colFilter != cValueFilter) {
						if (!isNaN(parseFloat(colValue))) 
							retValue += parseFloat(colValue);
					}
				}
			}
			return retValue;
		}
		if (arguments.length == 8) { // evaluate 2 columns
			filterType = arguments[2];
			cNameFilter = arguments[3];
			cValueFilter = arguments[4];
			filterType2 = arguments[5];
			cNameFilter2 = arguments[6];
			cValueFilter2 = arguments[7];
			for (var ea in tObj) {
				var row = tObj[ea];
				var colValue = row[cNameToSum].fieldValue;
				var colFilter = row[cNameFilter].fieldValue;
				var colFilter2 = row[cNameFilter2].fieldValue;
				if ((filterType == "INCLUDE") && (filterType2 == "INCLUDE")) {
					if ((colFilter == cValueFilter) && (colFilter2 == cValueFilter2)) {
						if (!isNaN(parseFloat(colValue))) 
							retValue += parseFloat(colValue);
					}
				}
				if ((filterType == "INCLUDE") && (filterType2 == "EXCLUDE")) {
					if ((colFilter == cValueFilter) && (colFilter2 != cValueFilter2)) {
						if (!isNaN(parseFloat(colValue))) 
							retValue += parseFloat(colValue);
					}
				}
				if ((filterType == "EXCLUDE") && (filterType2 == "EXCLUDE")) {
					if ((colFilter != cValueFilter) && (colFilter2 != cValueFilter2)) {
						if (!isNaN(parseFloat(colValue))) 
							retValue += parseFloat(colValue);
					}
				}
				if ((filterType == "EXCLUDE") && (filterType2 == "INCLUDE")) {
					if ((colFilter != cValueFilter) && (colFilter2 == cValueFilter2)) {
						if (!isNaN(parseFloat(colValue))) 
							retValue += parseFloat(colValue);
					}
				}
			}
			return retValue;
		}
	}
}


function testingContractorRenewal(){
        logDebug("within 1");
	parentCapId = getParentCapID4Renewal();
	var contractorLicNum = getAppSpecific("Plumbing Contractor License Number",parentCapId);
	if (!matches(contractorLicNum,null,"",undefinded)){
		var contractorCapId = getApplication(contractorLicNum);
		if(isValidContractorLicense("Licenses/Plumbing/Contractor/License",contractorCapId)) {
			renewCapId = createCap("Licenses/Plumbing/Contractor/Renewal","")
			recId = String(contractorCapId).split("-");
			licenseId = aa.cap.getCapID(recId[0],recId[1],recId[2]).getOutput();
			renewLinkResult = aa.cap.createRenewalCap(licenseId, renewCapId, false);
		}
	}
}


function totalWFBillableHours(){
//EK 12/3/2015 - based on totalWFHours function

useTaskSpecificGroupName = true;
var thisArr = new Array();
loadTaskSpecific(thisArr);
	
	if (!matches(wfTask,null,undefined,"")){
		//set variable to hold the value contained in Billable Hours Spent TSI
           var billableHoursSpent = Number(0);

           if (thisArr[wfProcess + "." + wfTask + ".Billable Hours Spent"] != null){
			billableHoursSpent = Number(thisArr[wfProcess + "." + wfTask + ".Billable Hours Spent"]);
           } 

           //set Billable Task Hours TSI
		if (thisArr[wfProcess + "." + wfTask + ".Billable Task Hours"] == null){
			editTaskSpecific(wfTask,"Billable Task Hours", billableHoursSpent);
		}else{
			var totalBillableTaskHours = (Number(thisArr[wfProcess + "." + wfTask + ".Billable Task Hours"]) + Number(billableHoursSpent));
			logDebug("BillableTaskHours " + totalBillableTaskHours);
			editTaskSpecific(wfTask,"Billable Task Hours",totalBillableTaskHours);
		}		
	}
	
	var workflowResult = aa.workflow.getTasks(capId);
	
    if (workflowResult.getSuccess())
        var wfObj = workflowResult.getOutput();
    else
    { logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
	
	var totalBillableHoursArray = new Array();

    for (i in wfObj) {
        var fTask = wfObj[i];
		
		useTaskSpecificGroupName = true;
		var tArray = new Array();
		loadTaskSpecific(tArray);

		if (!matches(fTask.getTaskDescription(),null,undefined,"")){
			logDebug("within1");
			if (tArray[wfProcess + "." + fTask.getTaskDescription() + ".Billable Task Hours"] != null){
				var hours = tArray[wfProcess + "." + fTask.getTaskDescription() + ".Billable Task Hours"];
				logDebug("billable hours: " + tArray[wfProcess + "." + fTask.getTaskDescription() + ".Billable Task Hours"]);
				totalBillableHoursArray.push(hours);
			}
		}
    }
	
	logDebug("totalBillableHoursArray: " + totalBillableHoursArray);
	var totalBillableHours = 0;

	for (ii in totalBillableHoursArray){
		totalBillableHours += Number(totalBillableHoursArray[ii]);
	}
	
	logDebug("totalBillableHours: " + totalBillableHours);
	
	for (x in wfObj) {
        var fTask = wfObj[x];
		
		useTaskSpecificGroupName = true;
		var totalArray = new Array();
		loadTaskSpecific(totalArray);
		if (!matches(fTask.getTaskDescription(),null,undefined,"")){
			editTaskSpecific(fTask.getTaskDescription(),"Billable Total Hours",totalBillableHours);
			editAppSpecific("Billable Hours",totalBillableHours);
			
		}
	}	
	
}


function totalWFHours(){
//Introduced 09/23/2015 Jaime S.

useTaskSpecificGroupName = true;
var thisArr = new Array();
loadTaskSpecific(thisArr);
	
	if (!matches(wfTask,null,undefined,"")){
		if (thisArr[wfProcess + "." + wfTask + ".Task Hours"] == null){
			editTaskSpecific(wfTask,"Task Hours",wfHours);
		}else{
			var totalTaskHours = (Number(thisArr[wfProcess + "." + wfTask + ".Task Hours"]) + Number(wfHours));
			logDebug("taskHours " + totalTaskHours);
			editTaskSpecific(wfTask,"Task Hours",totalTaskHours);
		}		
	}
	
	var workflowResult = aa.workflow.getTasks(capId);
	
    if (workflowResult.getSuccess())
        var wfObj = workflowResult.getOutput();
    else
    { logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
	
	var totalHoursArray = new Array();

    for (i in wfObj) {
        var fTask = wfObj[i];
		
		useTaskSpecificGroupName = true;
		var tArray = new Array();
		loadTaskSpecific(tArray);

		if (!matches(fTask.getTaskDescription(),null,undefined,"")){
			logDebug("within1");
			if (tArray[wfProcess + "." + fTask.getTaskDescription() + ".Task Hours"] != null){
				var hours = tArray[wfProcess + "." + fTask.getTaskDescription() + ".Task Hours"];
				logDebug("hours: " + tArray[wfProcess + "." + fTask.getTaskDescription() + ".Task Hours"]);
				totalHoursArray.push(hours);
			}
		}
    }
	
	logDebug("totalHoursArray: " + totalHoursArray);
	var totalHours = 0;

	for (ii in totalHoursArray){
		totalHours += Number(totalHoursArray[ii]);
	}
	
	logDebug("totalHours: " + totalHours);
	
	for (x in wfObj) {
        var fTask = wfObj[x];
		
		useTaskSpecificGroupName = true;
		var totalArray = new Array();
		loadTaskSpecific(totalArray);
		if (!matches(fTask.getTaskDescription(),null,undefined,"")){
			editTaskSpecific(fTask.getTaskDescription(),"Total Hours",totalHours);
		}
	}	
	
}



function updateAltID(newAltId) {
  itemCap = (arguments.length == 2) ? itemCap = arguments[1] : itemCap = capId
  updateResult = aa.cap.updateCapAltID(itemCap, newAltId)
  if (!updateResult.getSuccess()) {
    logDebug("WARNING: the altId was NOT updated to: " + newAltId + ", record ID still " + itemCap.getCustomID() + ": " + updateResult.getErrorMessage())
    return true
  }
  else {
    logDebug("Successfully changed the altId from: " + itemCap.getCustomID() + " to: " + newAltId)
  }
  return false
}
/* 	Record Types: 
		Licenses/Health/Reinstatement Reclassification/NA	
		Licenses/Nursing/Relicensure/NA

	Populate Custom fields with information from Parent license:
		License Number   
		License Expiration Date
 */
function updateAmendmentCustomFields(){

if (appTypeArray[2] == "Relicensure" || appTypeArray[2] == "Reinstatement Reclassification"){
	
	var pCapId = parentCapId; 
	var pCap = aa.cap.getCap(pCapId).getOutput();
	var pCapAlias = pCap.getCapModel().getAppTypeAlias();
	var parentAltId = pCapId.getCustomID();
	var thisExpDate = returnExpDateMMDDYYYY(parentCapId);
	
	logDebug("pCapAlias: " + pCapAlias);
	logDebug("parentAltId: " + parentAltId);
	logDebug("thisExpDate: " + thisExpDate);
	
	editAppSpecific("License Type", pCapAlias);
	editAppSpecific("License Number", parentAltId);
	editAppSpecific("License Expiration Date", thisExpDate);
}

	function returnExpDateMMDDYYYY(itemCap){
	var b1ExpResult = aa.expiration.getLicensesByCapID(itemCap);
		if(b1ExpResult.getSuccess()){
			b1Exp = b1ExpResult.getOutput();
			if(b1Exp != null){
				var tmpDate = b1Exp.getExpDate();
				var jsDate = convertDate(tmpDate);
				var expDate = jsDateToMMDDYYYY(jsDate);
			}
		}else{
			logDebug("No expiration info found.");
		}
	return expDate;
	}
}




function updateAppNameToContactName(contactType){
	var appContact = null;
	var newname = "";
	var bContName = false;
	var itemCap = capId
	
	if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

	appContact = getContactObj(itemCap,contactType)
	logDebug("Build Contact");
	if (appContact)
	{
		peop = appContact.people;
		cont = appContact.capContact;
		
		if (cont.getLastName() != null){
			newname = cont.getLastName()
			bContName = true;
			logDebug("last name")
		}
		if (cont.getFirstName() != null && bContName){
			newname += ", " + cont.getFirstName()
		}
		if (peop.getMiddleName() != null && bContName){
			newname += " " + peop.getMiddleName();
		}
		if(peop.getBusinessName() != null && bContName){
			newname += " - " + peop.getBusinessName();
			logDebug("business");
		}
		if(peop.getBusinessName() != null && bContName ==  false){
			newname = peop.getBusinessName();
			logDebug("only businness");
		}
		editAppName(newname,itemCap);
		logDebug("edited name");
	}
}
function updateFeeFromASI (ASIField, FeeCode, FeeSchedule) {
	var ASIField;
	var FeeCode;
	var FeeSchedule;
	logDebug("updateFeeFromASI Function: ASI Field = " + ASIField + "; Fee Code = " + FeeCode + "; Fee Schedule: " + FeeSchedule);
	if (arguments.length == 3) 
		{
		ASIField = arguments[0]; // ASI Field to get the value from
		FeeCode = arguments[1]; // Fee code to update
		FeeSchedule = arguments[2]; // Fee Scheulde for Fee Code
		}
	else {
		logDebug("Not enought arguments passed to the function: updateFeeFromASI");
	}
	var tmpASIQty = getAppSpecific(ASIField)
	var newFee = false;
	
	//Check to see if the ASI Field has a value. If so, then check to see if the fee exists.
	if ((tmpASIQty != null) && (tmpASIQty > 0)) {
		logDebug("ASI Field: " + ASIField + " was found and has a positive value. Attempting to update fee information.");
		//If fee already exist and the amount is different than the ASIQty, void or remove it before adding the new qty.
		if (feeExists(FeeCode) && (tmpASIQty != getFeeQty(FeeCode))) {
			// This check has to occur before the update to ensure we fetch the right value.
			if (tmpASIQty > getFeeQty(FeeCode)){
				newFee = true;
			}
			logDebug("Existing fee found with quanity: " + getFeeQty(FeeCode) + ". New Quantity is: " + tmpASIQty);
			voidRemoveFees(FeeCode)
			//Add the new fee from ASI quanity.
			updateFee(FeeCode,FeeSchedule,"FINAL",tmpASIQty,"Y");
			logDebug("Fee information has been modified.");
		}
		else if (feeExists(FeeCode) && (tmpASIQty == getFeeQty(FeeCode))) {
			logDebug("Existing fee found with quanity: " + getFeeQty(FeeCode) + ". New Quantity is: " + tmpASIQty + ". No changes are being made to fee.");
			}
		//No existing fee is found, add the new fee
		if (feeExists(FeeCode) != true) {
			updateFee(FeeCode,FeeSchedule,"FINAL",tmpASIQty,"Y");
			logDebug("Fee information has been modified.");
			newFee = true;
		}
	}
	//ASI Field doesn't exist or has a value <= 0.
	else {
		logDebug("ASI Field: " + ASIField + " is not found or has a value <= 0.")
		//Check to see if a fee for the ASI item exists. No fee should be present, but check anyways.
		if (feeExists(FeeCode)) {
			//Fee is found and should be voided or removed.
			voidRemoveFees(FeeCode)
		}
		
	}
	return newFee;
}



function updateFeeFromASIandUpdateASIFeeAndTotal (ASIField, FeeCode, FeeSchedule) {
	var ASIField;
	var FeeCode;
	var FeeSchedule;
	logDebug("updateFeeFromASI Function: ASI Field = " + ASIField + "; Fee Code = " + FeeCode + "; Fee Schedule: " + FeeSchedule);
	if (arguments.length == 3) 
		{
		ASIField = arguments[0]; // ASI Field to get the value from
		FeeCode = arguments[1]; // Fee code to update
		FeeSchedule = arguments[2]; // Fee Scheulde for Fee Code
		}
	else {
		logDebug("Not enought arguments passed to the function: updateFeeFromASIandUpdateASIFeeAndTotal");
	}
	var tmpASIQty = getAppSpecific(ASIField)
	
	//Check to see if the ASI Field has a value. If so, then check to see if the fee exists.
	if ((tmpASIQty != null) && (tmpASIQty > 0)) {
		logDebug("ASI Field: " + ASIField + " was found and has a positive value. Attempting to update fee information.");
		//If fee already exist and the amount is different than the ASIQty, void or remove it before adding the new qty.
		if (feeExists(FeeCode) && (tmpASIQty != getFeeQty(FeeCode))) {
			logDebug("Existing fee found with quanity: " + getFeeQty(FeeCode) + ". New Quantity is: " + tmpASIQty);
			voidRemoveFees(FeeCode)
			//Add the new fee from ASI quanity.
			updateFee(FeeCode,FeeSchedule,"FINAL",tmpASIQty,"N","Y");
			logDebug("Fee information has been modified.");
		}
		else if (feeExists(FeeCode) && (tmpASIQty == getFeeQty(FeeCode))) {
			logDebug("Existing fee found with quanity: " + getFeeQty(FeeCode) + ". New Quantity is: " + tmpASIQty + ". No changes are being made to fee.");
			}
		//No existing fee is found, add the new fee
		if (feeExists(FeeCode) != true) {
			updateFee(FeeCode,FeeSchedule,"FINAL",tmpASIQty,"N","Y");
			logDebug("Fee information has been modified.");
		}
	}
	//ASI Field doesn't exist or has a value <= 0.
	else {
		logDebug("ASI Field: " + ASIField + " is not found or has a value <= 0.")
		//Check to see if a fee for the ASI item exists. No fee should be present, but check anyways.
		if (feeExists(FeeCode)) {
			//Fee is found and should be voided or removed.
			voidRemoveFees(FeeCode)
		}
	}
	var feeAmount= getFeeAmount(FeeCode);

        var currCost = 0;
	if(tmpASIQty){
	       currCost = isNaN(tmpASIQty)? 0 : feeAmount/tmpASIQty;
	}
       
	
editAppSpecific(ASIField+ " Cost", currCost);
	editAppSpecific(ASIField+ " Fee", feeAmount);
        editAppSpecific(ASIField+ " cost", currCost);
	editAppSpecific(ASIField+ " fee", feeAmount);


	
}

function updateFeeFromASIandUpdateASIFeeAndTotalInvoice(ASIField, FeeCode, FeeSchedule) {
	var ASIField;
	var FeeCode;
	var FeeSchedule;
	logDebug("updateFeeFromASI Function: ASI Field = " + ASIField + "; Fee Code = " + FeeCode + "; Fee Schedule: " + FeeSchedule);
	if (arguments.length == 3) 
		{
		ASIField = arguments[0]; // ASI Field to get the value from
		FeeCode = arguments[1]; // Fee code to update
		FeeSchedule = arguments[2]; // Fee Scheulde for Fee Code
		}
	else {
		logDebug("Not enought arguments passed to the function: updateFeeFromASIandUpdateASIFeeAndTotal");
	}
	var tmpASIQty = getAppSpecific(ASIField)
	
	//Check to see if the ASI Field has a value. If so, then check to see if the fee exists.
	if ((tmpASIQty != null) && (tmpASIQty > 0)) {
		logDebug("ASI Field: " + ASIField + " was found and has a positive value. Attempting to update fee information.");
		//If fee already exist and the amount is different than the ASIQty, void or remove it before adding the new qty.
		if (feeExists(FeeCode) && (tmpASIQty != getFeeQty(FeeCode))) {
			logDebug("Existing fee found with quanity: " + getFeeQty(FeeCode) + ". New Quantity is: " + tmpASIQty);
			voidRemoveFees(FeeCode)
			//Add the new fee from ASI quanity.
			updateFee(FeeCode,FeeSchedule,"FINAL",tmpASIQty,"Y");
			logDebug("Fee information has been modified.");
		}
		else if (feeExists(FeeCode) && (tmpASIQty == getFeeQty(FeeCode))) {
			logDebug("Existing fee found with quanity: " + getFeeQty(FeeCode) + ". New Quantity is: " + tmpASIQty + ". No changes are being made to fee.");
			}
		//No existing fee is found, add the new fee
		if (feeExists(FeeCode) != true) {
			updateFee(FeeCode,FeeSchedule,"FINAL",tmpASIQty,"Y");
			logDebug("Fee information has been modified.");
		}
	}
	//ASI Field doesn't exist or has a value <= 0.
	else {
		logDebug("ASI Field: " + ASIField + " is not found or has a value <= 0.")
		//Check to see if a fee for the ASI item exists. No fee should be present, but check anyways.
		if (feeExists(FeeCode)) {
			//Fee is found and should be voided or removed.
			voidRemoveFees(FeeCode)
		}
	}
	var feeAmount= getFeeAmount(FeeCode);

        var currCost = 0;
	if(tmpASIQty){
	       currCost = isNaN(tmpASIQty)? 0 : feeAmount/tmpASIQty;
	}
       
	editAppSpecific(ASIField+ " Cost", currCost);
	editAppSpecific(ASIField+ " Fee", feeAmount);
        editAppSpecific(ASIField+ " cost", currCost);
	editAppSpecific(ASIField+ " fee", feeAmount);
}


function updateRecordRelation(recA, recB, mod) {
	capA = aa.cap.getCapID(recA).getOutput();
	licNumber = "" + capA.getCustomID();
	capB = aa.cap.getCapID(recB).getOutput()
	if (capA == null || capB == null ) {
		logDebug("Cannot update relation between "+recA+" and "+recB+" because they do not both exist")
		return false
	}
	switch((""+mod).toUpperCase()) {
	case "ADDITION":
		linkResult = aa.cap.createAppHierarchy(capA, capB);
		if (licNumber.indexOf("61") == 0) {
			editAppSpecific("RELATED LICENSES.Master License Number", capB.getCustomID(), capA);
		}
		return linkResult.getSuccess()
	case "REMOVE":
		linkResult = aa.cap.removeAppHierarchy(capA, capB);
		if (licNumber.indexOf("61") == 0) {
			useAppSpecificGroupName = false;
			editAppSpecific("RELATED LICENSES.Master License Number", "", capA);
		}
		return linkResult.getSuccess()
	}
	return false

}


function updateRelationship2RealCAP(parentLicenseCAPID, capID) {
	logDebug("updateRelationship2RealCAP")
	var result = aa.cap.createRenewalCap(parentLicenseCAPID, capID, false);
	if (result.getSuccess()) {
		var projectScriptModel = result.getOutput();
		projectScriptModel.setStatus("Incomplete");
		var result1 = aa.cap.updateProject(projectScriptModel);
		if (!result1.getSuccess()) {
			logDebug("ERROR: Failed update relationship status CAPID(" + capID + "): " + result1.getErrorMessage());
		}
	}
	else { logDebug("ERROR: Failed to create renewal relationship parentCAPID(" + parentLicenseCAPID + "),CAPID(" + capid + "): " + result.getErrorMessage()); }
}


function updateRNSpecialtyCertificationTable(vCapId,vTargetCapId) {
	var thisCapId = vCapId;
	var targetCapId = vTargetCapId;
	var asiTableName = "NURSE SPECIALTY CERTIFICATION";
	var targetASITableArray = loadASITable(asiTableName,targetCapId);
	var vUpdatedSpecialtyCertificationTable = new Array();
	var vRNSpecialtyArray = getRegisteredNurseSpecialty("Active",thisCapId);
	var vRNTargetSpeciltyArray = getRegisteredNurseSpecialty("Active",targetCapId);
	var vDeactivateSpecialtyArray = new Array();
	var vNewSpecialtyArray = new Array();

	if((appMatch("Licenses/Nursing/Registered Nurse/Renewal",thisCapId) ||
		appMatch("Licenses/Nursing/Nurse Specialty/Application",thisCapId)) && 
		vEventName == "ApplicationSubmitAfter"){
		// Use values of the License Specialty Custom List and update Custom Fields
		for(var iRNTA in vRNTargetSpeciltyArray){
			editAppSpecific(vRNTargetSpeciltyArray[iRNTA],"CHECKED",thisCapId);
		}
		
	}
	
	if(appMatch("Licenses/Nursing/Registered Nurse/Renewal",thisCapId) && vEventName == "WorkflowTaskUpdateAfter"){
		if(vRNTargetSpeciltyArray && vRNTargetSpeciltyArray.length > 0){
			for(var iRNTW in vRNTargetSpeciltyArray){
				if(!isInArray(vRNSpecialtyArray,vRNTargetSpeciltyArray[iRNTW])){
					// License contains Specialty that does not exist in the renewal so we need to deactivate the row it and add an end date
					vDeactivateSpecialtyArray.push(vRNTargetSpeciltyArray[iRNTW]);
				}
			}
			
			
			// We are comparing the table to see if we are adding a new row or updating
			for(iTRN in targetASITableArray){
				var targetTableRow = targetASITableArray[iTRN];
				var tableRow = new Array();
				if(isInArray(vDeactivateSpecialtyArray,targetTableRow["Specialty Certification"].fieldValue) && targetTableRow["Status"].fieldValue == "Active") {
					// Deactivate This Row becuse the customer disabled it on the renewal record
					tableRow["Specialty Certification"] = new asiTableValObj("Specialty Certification", targetTableRow["Specialty Certification"].fieldValue, "N");
					tableRow["Status"] = new asiTableValObj("Specialty Certification", "Inactive", "N");
					tableRow["Start Date"] = new asiTableValObj("Start Date", targetTableRow["Start Date"].fieldValue, "N");
					tableRow["End Date"] = new asiTableValObj("End Date", sysDateMMDDYYYY, "N");
					vUpdatedSpecialtyCertificationTable.push(tableRow);
				}
				else{
					// Carry over the row
					vUpdatedSpecialtyCertificationTable.push(targetTableRow);
				}
			}
		}
	}
	
	if(appMatch("Licenses/Nursing/Registered Nurse/Application",thisCapId) && vEventName == "WorkflowTaskUpdateAfter"){
		if(vRNSpecialtyArray && vRNSpecialtyArray.length > 0){
			
			for(iRN in vRNSpecialtyArray){
				var tableRow = new Array();
				// Create the table rows for the new License
				tableRow["Specialty Certification"] = new asiTableValObj("Specialty Certification", vRNSpecialtyArray[iRN], "N");
				tableRow["Status"] = new asiTableValObj("Specialty Certification", "Active", "N");
				tableRow["Start Date"] = new asiTableValObj("Start Date", sysDateMMDDYYYY, "N");
				tableRow["End Date"] = new asiTableValObj("End Date", null, "N");
				vUpdatedSpecialtyCertificationTable.push(tableRow);
			
			}
		}
	}
	
	if(appMatch("Licenses/Nursing/Nurse Specialty/Application",thisCapId) && 
		vEventName == "WorkflowTaskUpdateAfter"){
			// Carry over existing rows
			for(iTRN in targetASITableArray){
				var targetTableRow = targetASITableArray[iTRN];
				vUpdatedSpecialtyCertificationTable.push(targetTableRow);
			}
			
			for(var iRNSA in vRNSpecialtyArray){
				if(!isInArray(vRNTargetSpeciltyArray,vRNSpecialtyArray[iRNSA])){
					// License contains Specialty that does not exist in the renewal so we need to deactivate the row it and add an end date
					vNewSpecialtyArray.push(vRNSpecialtyArray[iRNSA]);
				}
			}
			
			// Create the table rows for the new License
			for(iRN in vNewSpecialtyArray){
				var tableRow = new Array();
				tableRow["Specialty Certification"] = new asiTableValObj("Specialty Certification", vNewSpecialtyArray[iRN], "N");
				tableRow["Status"] = new asiTableValObj("Specialty Certification", "Active", "N");
				tableRow["Start Date"] = new asiTableValObj("Start Date", sysDateMMDDYYYY, "N");
				tableRow["End Date"] = new asiTableValObj("End Date", null, "N");
				vUpdatedSpecialtyCertificationTable.push(tableRow);
			}
			
		}
	
	if (vUpdatedSpecialtyCertificationTable.length > 0){
		// Remove the existing table and add the new one.
		removeASITable(asiTableName, targetCapId);
		addASITable(asiTableName, vUpdatedSpecialtyCertificationTable, targetCapId);
		logDebug("(updateRNSpecialtyCertificationTable) Successfully Updated " + asiTableName);
		return true;
	}
}
// validate conditions have been met to proceed in workflow
// added modified function to determine if condition = Applied or Not Applied by condition status type

function validateConditionsMet(){
	if (wfTask == "Background Review" && matches(wfStatus, "Completed", "Not Applicable", "Denied")){
		if (appHasConditionLocal("Licensing General", "Applied", "Conviction Explanation", null)){
			showMessage = true;
			cancel = true;
			comment("Conviction Explanation condition must be met to proceed.");
		}
		if (appHasConditionLocal("Licensing General", "Applied", "Criminal Background Check", null)){
			showMessage = true;
			cancel = true;
			comment("Criminal Background Check condition must be met to proceed.");
		}
		if (appHasConditionLocal("Licensing General", "Applied", "Disciplinary Action Statement", null)){
			showMessage = true;
			cancel = true;
			comment("Disciplinary Action Statement condition must be met to proceed.");
		}
	} // task=Background Review, status=Completed,Not Applicable
	
	if (wfTask == "Application Review" && wfStatus == "Application Review Complete"){
		if (appHasConditionLocal("Licensing General", "Applied", "SSN Affidavit", null)){
			showMessage = true;
			cancel = true;
			comment("SSN Affidavit condition must be met to proceed.");
		}
		if (appHasConditionLocal("Licensing General", "Applied", "Verification of Licensure", null)){
			showMessage = true;
			cancel = true;
			comment("Verification of Licensure condition must be met to proceed.");
		}
		if (appHasConditionLocal("Nursing", "Applied", "CGFNS Certification Program", null)){
			showMessage = true;
			cancel = true;
			comment("CGFNS Certification Program condition must be met to proceed.");
		}
		if (appHasConditionLocal("Nursing", "Applied", "CGFNS Professional Report or NACES Evaluation", null)){
			showMessage = true;
			cancel = true;
			comment("CGFNS Professional Report or NACES Evaluation condition must be met to proceed.");
		}
		if (appHasConditionLocal("Nursing", "Applied", "Canadian Verification", null)){
			showMessage = true;
			cancel = true;
			comment("Canadian Verification condition must be met to proceed.");
		}
		if (appHasConditionLocal("Nursing", "Applied", "Nursing School Transcript or Certification/Roster", null)){
			showMessage = true;
			cancel = true;
			comment("Nursing School Transcript or Certification/Roster condition must be met to proceed.");
		}
		if (appHasConditionLocal("Nursing", "Applied", "TOEFL-IBT", null)){
			showMessage = true;
			cancel = true;
			comment("TOEFL-IBT condition must be met to proceed.");
		}
		if (appHasConditionLocal("Nursing", "Applied", "Specialty Certification", null)){
			showMessage = true;
			cancel = true;
			comment("Specialty Certification condition must be met to proceed.");
		}
	} // task=Application Review, status=Application Review Complete

	if (wfTask == "Renewal Review" && matches(wfStatus, "Renewal Review Complete", "Denied")){
		if (appHasConditionLocal("Licensing General", "Applied", "Conviction Information", null)){
			showMessage = true;
			cancel = true;
			comment("Conviction Information condition must be met to proceed.");
		}
		if (appHasConditionLocal("Licensing General", "Applied", "Disciplinary Action Explanation", null)){
			showMessage = true;
			cancel = true;
			comment("Disciplinary Action Explanation condition must be met to proceed.");
		}
	} // task=Renewal Review, status=Renewal Review Complete, Denied

//  Helper Function
	
function appHasConditionLocal(pType,pStatus,pDesc,pImpact){
		// modified to check by status (Applied) and by status type (Applied or Not Applied) rather than configured status name

	if (pType==null)
		var condResult = aa.capCondition.getCapConditions(capId);
	else
		var condResult = aa.capCondition.getCapConditions(capId,pType);
		
	if (condResult.getSuccess())
		var capConds = condResult.getOutput();
	else
		{ 
		logMessage("**ERROR: getting cap conditions: " + condResult.getErrorMessage());
		logDebug("**ERROR: getting cap conditions: " + condResult.getErrorMessage());
		return false;
		}
	
	for (cc in capConds){
		var thisCond = capConds[cc];
		var cType = thisCond.getConditionType();
		var cStatus = thisCond.getConditionStatus();
		var cStatusType = thisCond.getConditionStatusType();
		var cDesc = thisCond.getConditionDescription();
		var cImpact = thisCond.getImpactCode();
			
		if (cStatusType==null)
			cStatusType = " ";
		if (cDesc==null)
			cDesc = " ";
		if (cImpact==null)
			cImpact = " ";
		//Look for matching condition
		
				// comparing both configured status name and status type, one of which might = Applied
		if ((pStatus==null || pStatus.toUpperCase().equals(cStatus.toUpperCase())
				|| cStatusType.toUpperCase().equals(pStatus.toUpperCase()))      
			&& (pDesc==null || pDesc.toUpperCase().equals(cDesc.toUpperCase())) 
			&& (pImpact==null || pImpact.toUpperCase().equals(cImpact.toUpperCase())))
			return true; //matching condition found
		}
	return false; //no matching condition found
} // appHasConditionLocal		
	
} // function


function validateLicenseForTrade() {
	lpList = aa.env.getValue("LicProfList");
	if (lpList) {
	try {
			lpArr = lpList.toArray();
			logDebug("Found " + lpArr.length + " lic profs");
		}
		catch (err) { return; }
		
		if (lpArr.length > 0) {
			for (licProf in lpArr) {
				thisLP = lpArr[licProf];
				licNum = thisLP.getLicenseNbr();
				var licCapResult = aa.cap.getCapID(licNum);
				if (licCapResult.getSuccess()) {
					licCapId = licCapResult.getOutput();
					var capResult = aa.cap.getCap(licCapId);
					if (capResult.getSuccess()) {
						licCap = capResult.getOutput();
						if (licCap != null) {
							appStatus = "" + licCap.getCapStatus();
							if (appStatus != "Issued") {
								//cancel = true;
								showMessage = true; logMessage("License " + licNum + " does not have a status of Issued");
								logDebug("License " + licNum + " does not have a status of Issued");
							}
						}
					}
				}
				else { cancel = true; showMessage = true; logMessage("License " + licNum + " is not valid"); }
			} // end for loop
		}
	}
}


function voidRemoveFees(vFeeCode)
	{
	var feeSeqArray = new Array();
	var invoiceNbrArray = new Array();
	var feeAllocationArray = new Array();
    var itemCap = capId;
    if (arguments.length > 1)
        itemCap = arguments[1];
 
	// for each fee found
	//  	  if the fee is "NEW" remove it
	//  	  if the fee is "INVOICED" void it and invoice the void
	//
	
	var targetFees = loadFees(itemCap);

	for (tFeeNum in targetFees)
		{
		targetFee = targetFees[tFeeNum];

		if (targetFee.code.equals(vFeeCode))
			{

			// only remove invoiced or new fees, however at this stage all AE fees should be invoiced.

			if (targetFee.status == "INVOICED")
				{
				var editResult = aa.finance.voidFeeItem(itemCap, targetFee.sequence);

				if (editResult.getSuccess())
					logDebug("Voided existing Fee Item: " + targetFee.code);
				else
					{ logDebug( "**ERROR: voiding fee item (" + targetFee.code + "): " + editResult.getErrorMessage()); return false; }

				var feeSeqArray = new Array();
				var paymentPeriodArray = new Array();

				feeSeqArray.push(targetFee.sequence);
				paymentPeriodArray.push(targetFee.period);
				var invoiceResult_L = aa.finance.createInvoice(itemCap, feeSeqArray, paymentPeriodArray);

				if (!invoiceResult_L.getSuccess())
					{
					logDebug("**ERROR: Invoicing the fee items voided " + thisFee.code + " was not successful.  Reason: " +  invoiceResult_L.getErrorMessage());
					return false;
					}

				}



			if (targetFee.status == "NEW")
				{
				// delete the fee
				var editResult = aa.finance.removeFeeItem(itemCap, targetFee.sequence);

				if (editResult.getSuccess())
					logDebug("Removed existing Fee Item: " + targetFee.code);
				else
					{ logDebug( "**ERROR: removing fee item (" + targetFee.code + "): " + editResult.getErrorMessage()); return false; }

				}

			} // each matching fee
		}  // each  fee
}  // function
	

