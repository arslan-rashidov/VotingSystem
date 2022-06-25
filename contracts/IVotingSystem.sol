pragma solidity ^0.8.0;
// SPDX-License-Identifier: UNLICENSED

interface IVotingSystem {

    enum VotingStatus {
        Active,
        Finished
    }

    function createVoting(address[] memory candidates_) external;

    function makeVote(uint256 votingID, address votedCandidate) external payable;

    function finishVoting(uint256 votingID) external;

    function getVotingStatus(uint256 votingID) external;

    function getVotingCandidates(uint256 votingID) external;

    function getCandidateVotes(uint256 votingID, address candidate) external;

    function withdrawCreatorFee() external;
}