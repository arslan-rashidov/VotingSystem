pragma solidity ^0.8.0;
// SPDX-License-Identifier: UNLICENSED

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IVotingSystem.sol";

contract VotingSystem is IVotingSystem, Ownable {
    using Timers for Timers.Timestamp;
    using Counters for Counters.Counter;

    event VotingCreated(address[] candidates, uint256 votingID);
    event VoteMade(uint256 votingID, address votedCandidate, address voter); 
    event VotingFinished(uint256 votingID, address winner);
    event GotVotingStatus(uint256 votingID, bool isActive);
    event GotVotingCandidates(uint256 votingID, address[] candidates);
    event GotCandidateVotes(uint256 votingID, address candidate, uint256 votes);
    event CreatorFeeWithdrawed(bool isSent, uint256 amount);

    struct Voting {
        VotingStatus status;
        address[] candidatesArray;
        mapping (address => bool) candidates;
        mapping (address => bool) voters;

        uint256 maximumCandidateVotes;
        address bestCandidate;
        mapping (address => uint256) votes;

        Timers.Timestamp votingEnd;
        uint256 earnedEthereumAmount;
    }

    mapping (uint256 => Voting) private _votings;
    Counters.Counter private _votingIDCounter;
    uint256 private _creatorFee;

    function createVoting(address[] memory candidates_) external onlyOwner override {
        _votingIDCounter.increment();
        
        Voting storage voting = _votings[_votingIDCounter.current()];

        for (uint256 i = 0; i < candidates_.length; i++) {
            voting.candidates[candidates_[i]] = true;
        }
        voting.votingEnd.setDeadline(uint64(block.timestamp + 3 days));

        voting.candidatesArray = candidates_;
        voting.maximumCandidateVotes = 0;

        emit VotingCreated(candidates_, _votingIDCounter.current());
    }

    function makeVote(uint256 votingID, address votedCandidate) external payable override {
        require(_isVotingExists(votingID), "Voting does not exist."); //
        require(msg.value == 0.01 ether, "You need to send 0.01 Ether to make a vote.");//

        Voting storage voting = _votings[votingID];

        require(_isVotingActive(voting), "Voting has already finished."); //

        address voter = msg.sender;

        require(!_isVoterVoted(voting, voter), "You already voted in this voting."); //
        require(_isVotingCandidateExists(voting, votedCandidate), "There is no such candidate."); //

        voting.votes[votedCandidate] += 1;



        if (voting.votes[votedCandidate] > voting.maximumCandidateVotes) {
            voting.maximumCandidateVotes = voting.votes[votedCandidate];
            if (voting.bestCandidate != votedCandidate) {
                voting.bestCandidate = votedCandidate;
            }
        }

        voting.voters[voter] = true;
        voting.earnedEthereumAmount += msg.value;

        emit VoteMade(votingID, votedCandidate, voter);
    }

    function finishVoting(uint256 votingID) external override {
        require(_isVotingExists(votingID), "Voting does not exist."); 

        Voting storage voting = _votings[votingID];

        require(_isVotingActive(voting), "Voting has already finished."); 
        require(_isVotingExpired(voting), "Voting is still going.");

        voting.status = VotingStatus.Finished;

        address winner = voting.bestCandidate;
        uint256 reward = voting.earnedEthereumAmount * 9 / 10;
        uint256 fee = voting.earnedEthereumAmount - reward;
        _creatorFee += fee;

        payable(winner).transfer(reward);

        emit VotingFinished(votingID, winner);
    }

    function getVotingStatus(uint256 votingID) external override {
        require(_isVotingExists(votingID), "Voting does not exist."); 
        Voting storage voting = _votings[votingID];
        VotingStatus status_ = voting.status;

        if (status_ == VotingStatus.Active) {
            emit GotVotingStatus(votingID, true);
        } else {
            emit GotVotingStatus(votingID, false); 
        }
    }

    function getVotingCandidates(uint256 votingID) external override {
        require(_isVotingExists(votingID), "Voting does not exist.");
        Voting storage voting = _votings[votingID];

        emit GotVotingCandidates(votingID, voting.candidatesArray);
    }

    function getCandidateVotes(uint256 votingID, address candidate) external override {
        require(_isVotingExists(votingID), "Voting does not exist.");
        Voting storage voting = _votings[votingID];
        require(_isVotingCandidateExists(voting, candidate), "Candidate does not exist.");

        emit GotCandidateVotes(votingID, candidate, voting.votes[candidate]);
    }

    function withdrawCreatorFee() external onlyOwner override {
        require(!_isCreatorFeeEmpty(), "Nothing to withdraw.");

        payable(msg.sender).transfer(_creatorFee);

        emit CreatorFeeWithdrawed(true, _creatorFee);

        _creatorFee = 0;
    }

    function _isVotingExists(uint256 votingID) private view returns (bool) {
        Voting storage voting = _votings[votingID];
        return voting.votingEnd.isUnset() == false;
    }

    function _isVotingActive(Voting storage voting) private view returns (bool) {
        return voting.status == VotingStatus.Active;
    }

    function _isVotingExpired(Voting storage voting) private view returns (bool) {
        return voting.votingEnd.isExpired();
    }

    function _isVoterVoted(Voting storage voting, address voter) private view returns (bool) {
        return voting.voters[voter];
    }

    function _isVotingCandidateExists(Voting storage voting, address candidate) private view returns (bool) {
        return voting.candidates[candidate];
    }

    function _isCreatorFeeEmpty() private view returns (bool) {
        return !(_creatorFee > 0);
    }
}