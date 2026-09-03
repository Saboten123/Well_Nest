// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Contract 1: Private Patient Records (Limited Access)
contract PatientRecords {
    struct PatientRecord {
        bytes32 dataHash;
        string patientId;
        string doctor; // Who treated the patient
        uint256 timestamp;
    }

    // patientId => ordered list of data hashes (append-only)
    mapping(bytes32 => PatientRecord) private records;
    mapping(string => bytes32[]) private _recordsOfPatient;

    event RecordStored(bytes32 indexed recordHash, address indexed doctor);

    function storePatientRecord(
        bytes32 _dataHash,
        string memory _patient,
        string memory _doctor
    ) external {
        require(records[_dataHash].timestamp == 0, "Record already exists");//prevents duplication
        _recordsOfPatient[_patient].push(_dataHash);
        records[_dataHash] = PatientRecord({
            dataHash: _dataHash,
            patientId: _patient,
            doctor: _doctor,
            timestamp: block.timestamp
        });
        emit RecordStored(_dataHash, msg.sender);
    }

    function getAllPatientRecords(
        string memory _patient
    ) external view returns (PatientRecord[] memory) {
        bytes32[] memory hashes = _recordsOfPatient[_patient];
        PatientRecord[] memory allRecords = new PatientRecord[](hashes.length);

        for (uint256 i = 0; i < hashes.length; i++) {
            allRecords[i] = records[hashes[i]];
        }

        return allRecords;
    }
}
