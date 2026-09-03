// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Contract 2: Public Health Reports (Open for Verification)
contract PublicHealthReports {
    struct Location {
        string country;
        string state;
        string district;
        string pincode;
    }
    struct HealthReport {
        bytes32 dataHash;
        string reportType; // "outbreak","health_survey"
        Location location;
        string submittedBy; // Health worker, NGO, government official
        string email;
        uint256 timestamp;
        bool isverified;
        string verifiedById;
    }
    mapping(bytes32 => HealthReport) public reports;
    mapping(string => bytes32[]) public reportsByCountry;
    mapping(string => bytes32[]) public reportsByState;
    mapping(string => bytes32[]) public reportsByDistrict;
    mapping(string => bytes32[]) public reportsByPincode;
    mapping(string => bytes32[]) public reportsByType;

    // Note: Structs cannot be indexed in events, so we use string components
    event ReportSubmitted(
        bytes32 indexed reportHash,
        string indexed country,
        string indexed state,
        string district,
        string pincode,
        string reportType,
        address submitter
    );

    function submitHealthReport(
        bytes32 _dataHash,
        string memory _submittedBy,
        string memory _email,
        string memory _reportType,
        Location memory _location
    ) external {
        require(reports[_dataHash].timestamp == 0, "Report already exists"); //prevents duplication

        reports[_dataHash] = HealthReport({
            dataHash: _dataHash,
            reportType: _reportType,
            location: _location,
            submittedBy: _submittedBy,
            email: _email,
            timestamp: block.timestamp,
            isverified: false,
            verifiedById: ""
        });

        reportsByCountry[_location.country].push(_dataHash);
        reportsByState[_location.state].push(_dataHash);
        reportsByDistrict[_location.district].push(_dataHash);
        reportsByPincode[_location.pincode].push(_dataHash);
        reportsByType[_reportType].push(_dataHash);

        emit ReportSubmitted(
            _dataHash,
            _location.country,
            _location.state,
            _location.district,
            _location.pincode,
            _reportType,
            msg.sender
        );
    }

    // Anyone can verify public health reports
    function verifyHealthReport(
        bytes32 _dataHash,
        string memory by
    ) external returns (bool exists) {
        exists = (reports[_dataHash].timestamp != 0);
        if (exists) {
            reports[_dataHash].isverified = true;
            reports[_dataHash].verifiedById = by;
        }
        return exists;
    }

    // Get all reports by country
    function getReportsByCountry(
        string memory _country
    ) external view returns (bytes32[] memory) {
        return reportsByCountry[_country];
    }

    // Get all reports by state
    function getReportsByState(
        string memory _state
    ) external view returns (bytes32[] memory) {
        return reportsByState[_state];
    }

    // Get all reports by district
    function getReportsByDistrict(
        string memory _district
    ) external view returns (bytes32[] memory) {
        return reportsByDistrict[_district];
    }

    // Get all reports by pincode
    function getReportsByPincode(
        string memory _pincode
    ) external view returns (bytes32[] memory) {
        return reportsByPincode[_pincode];
    }

    // Get reports by complete location match (including pincode)
    function getReportsByLocation(
        Location memory _location
    ) external view returns (bytes32[] memory) {
        // Get pincode reports first (most specific set)
        bytes32[] memory pincodeReports = reportsByPincode[_location.pincode];

        // Count matching reports
        uint256 matchCount = 0;
        for (uint256 i = 0; i < pincodeReports.length; i++) {
            HealthReport memory report = reports[pincodeReports[i]];
            if (
                keccak256(bytes(report.location.country)) ==
                keccak256(bytes(_location.country)) &&
                keccak256(bytes(report.location.state)) ==
                keccak256(bytes(_location.state)) &&
                keccak256(bytes(report.location.district)) ==
                keccak256(bytes(_location.district)) &&
                keccak256(bytes(report.location.pincode)) ==
                keccak256(bytes(_location.pincode))
            ) {
                matchCount++;
            }
        }

        // Create result array
        bytes32[] memory matchingReports = new bytes32[](matchCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < pincodeReports.length; i++) {
            HealthReport memory report = reports[pincodeReports[i]];
            if (
                keccak256(bytes(report.location.country)) ==
                keccak256(bytes(_location.country)) &&
                keccak256(bytes(report.location.state)) ==
                keccak256(bytes(_location.state)) &&
                keccak256(bytes(report.location.district)) ==
                keccak256(bytes(_location.district)) &&
                keccak256(bytes(report.location.pincode)) ==
                keccak256(bytes(_location.pincode))
            ) {
                matchingReports[currentIndex] = pincodeReports[i];
                currentIndex++;
            }
        }

        return matchingReports;
    }


    // Get all reports by type (for analytics)
    function getReportsByType(
        string memory _reportType
    ) external view returns (bytes32[] memory) {
        return reportsByType[_reportType];
    }

    // Get complete report details
    function getReportDetails(
        bytes32 _dataHash
    ) external view returns (HealthReport memory) {
        require(reports[_dataHash].timestamp != 0, "Report does not exist");
        return reports[_dataHash];
    }
}