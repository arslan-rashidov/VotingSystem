const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

describe("VotingSystem Testing", function () {

    let votingSystem;
    let owner;
    let addresses;

    beforeEach(async function () {
        VotingSystem = await ethers.getContractFactory("VotingSystem");
        [owner, ...addresses] = await ethers.getSigners();
        votingSystem = await VotingSystem.deploy();
    });

    describe("Simple Calls Testing", function () { 
        it("CreateVoting works.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            const tx = await votingSystem.createVoting(candidates);
            const receipt = await tx.wait();
            const event = receipt.events[0];

            await expect(event.args.votingID).to.equal(1);
        });

        it("GetVotingStatus works.", async function() {
            await expect(votingSystem.getVotingStatus(1)).to.be.revertedWith('Voting does not exist.');

            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            const tx = await votingSystem.getVotingStatus(1);
            const receipt = await tx.wait();
            const event = receipt.events[0];
            await expect(event.args.votingID).to.equal(1);
            await expect(event.args.isActive).to.equal(true);
        });

        it("GetVotingCandidates works.", async function() {
            await expect(votingSystem.getVotingStatus(1)).to.be.revertedWith('Voting does not exist.');

            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            const tx = await votingSystem.getVotingCandidates(1);
            const receipt = await tx.wait();
            const event = receipt.events[0];
            await expect(event.args.votingID).to.equal(1);
            await expect(event.args.candidates.toString()).to.equal(candidates.toString());
        });

        it("GetCandidateVotes works.", async function() {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await votingSystem.makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.01')
            });

            const candidate = addresses[0].address;
            const tx = await votingSystem.getCandidateVotes(1, candidate);
            const receipt = await tx.wait();
            const event = receipt.events[0];
            await expect(event.args.votingID).to.equal(1);
            await expect(event.args.candidate).to.equal(candidate);
            await expect(event.args.votes).to.equal(1);
        });

        it("MakeVote works.", async function() {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            const txB = await votingSystem.getCandidateVotes(1, addresses[0].address);
            const receiptB = await txB.wait();
            const votesForCandidateBeforeMakingVote = receiptB.events[0].args.votes;
            await expect(votesForCandidateBeforeMakingVote).to.equal(0);

            await votingSystem.makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.01')
            });


            const txA = await votingSystem.getCandidateVotes(1, addresses[0].address);
            const receiptA = await txA.wait();
            const votesForCandidateAfterMakingVote = receiptA.events[0].args.votes;
            await expect(votesForCandidateAfterMakingVote).to.equal(1);
        });

        it("FinishVoting works.", async function() {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await expect(votingSystem.finishVoting(1)).to.be.revertedWith('Voting is still going.');


            const txStatusBeforeFinishing = await votingSystem.getVotingStatus(1);
            const receiptStatusBeforeFinishing = await txStatusBeforeFinishing.wait();
            const statusBeforeFinishing = receiptStatusBeforeFinishing.events[0].args.isActive;

            await expect(statusBeforeFinishing).to.be.equal(true);

            const threeDays = 3 * 24 * 60 * 60;

            await ethers.provider.send('evm_increaseTime', [threeDays]);
            await ethers.provider.send('evm_mine');

            await votingSystem.finishVoting(1);

            const txStatusAfterFinishing = await votingSystem.getVotingStatus(1);
            const receiptStatusAfterFinishing = await txStatusAfterFinishing.wait();
            const statusAfterFinishing = receiptStatusAfterFinishing.events[0].args.isActive;

            await expect(statusAfterFinishing).to.be.equal(false);
        });

        it("WithdrawCreatorFee works.", async function() {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await votingSystem.connect(addresses[3]).makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.01')
            });

            await votingSystem.connect(addresses[4]).makeVote(1, addresses[1].address, {
                value: ethers.utils.parseEther('0.01')
            });

            await votingSystem.connect(addresses[5]).makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.01')
            });

            const threeDays = 3 * 24 * 60 * 60;

            await ethers.provider.send('evm_increaseTime', [threeDays]);
            await ethers.provider.send('evm_mine');

            await votingSystem.finishVoting(1);

            const tx = await votingSystem.connect(owner).withdrawCreatorFee();
            const receipt = await tx.wait();
            const event = receipt.events[0];
            await expect(event.args.isSent).to.equal(true);
            await expect(event.args.amount.toString()).to.equal(ethers.utils.parseEther("0.003"));
        });
    });

    describe("Functions Accesses Testing", function() {
        it("Should set the right owner.", async function () {
            expect(await votingSystem.owner()).to.equal(owner.address);
        });

        it("Only owner can CreateVoting.", async function () {
            await expect(votingSystem.connect(addresses[0]).createVoting([addresses[0].address, addresses[1].address]))
            .to.be.revertedWith('Ownable: caller is not the owner');
        });

        it("Only owner can withdraw creator fee.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await votingSystem.connect(addresses[3]).makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.01')
            });

            const threeDays = 3 * 24 * 60 * 60;

            await ethers.provider.send('evm_increaseTime', [threeDays]);
            await ethers.provider.send('evm_mine');

            await votingSystem.finishVoting(1);

            await expect(votingSystem.connect(addresses[0]).withdrawCreatorFee())
            .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("MakeVote Testing", function() {
        it("Can't vote twice.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await votingSystem.connect(addresses[3]).makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.01')
            });

            await expect(votingSystem.connect(addresses[3]).makeVote(1, addresses[1].address, {
                value: ethers.utils.parseEther('0.01')
            }))
            .to.be.revertedWith('You already voted in this voting.');
        });

        it("Can't vote for candidate that doesn't exist.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await expect(votingSystem.connect(addresses[2]).makeVote(1, addresses[3].address, {
                value: ethers.utils.parseEther('0.01')
            }))
            .to.be.revertedWith('There is no such candidate.');
        });

        it("Can't vote in the finished voting.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);
            const threeDays = 3 * 24 * 60 * 60;

            await ethers.provider.send('evm_increaseTime', [threeDays]);
            await ethers.provider.send('evm_mine');

            await votingSystem.finishVoting(1);

            await expect(votingSystem.connect(addresses[2]).makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.01')
            }))
            .to.be.revertedWith('Voting has already finished.');
        });

        it("Can't vote if value is not correct.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await expect(votingSystem.connect(addresses[2]).makeVote(1, addresses[0].address, {
                value: ethers.utils.parseEther('0.00001')
            }))
            .to.be.revertedWith('You need to send 0.01 Ether to make a vote.');
        });

        it("Can't vote in a voting that doesn't exist.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await expect(votingSystem.connect(addresses[2]).makeVote(2, addresses[0].address, {
                value: ethers.utils.parseEther('0.00001')
            }))
            .to.be.revertedWith('Voting does not exist.');
        });
    });

    describe("FinishVoting Testing", function() {
        it("Can't finish voting that doesn't exist.", async function () {
            await expect(votingSystem.finishVoting(1)).to.be.revertedWith("Voting does not exist.");
        });

        it("Can't finish voting that already finished.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);
            const threeDays = 3 * 24 * 60 * 60;

            await ethers.provider.send('evm_increaseTime', [threeDays]);
            await ethers.provider.send('evm_mine');

            await votingSystem.finishVoting(1);

            await expect(votingSystem.finishVoting(1)).to.be.revertedWith("Voting has already finished.");
        });

        it("Can't finish active voting.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await expect(votingSystem.finishVoting(1)).to.be.revertedWith("Voting is still going.");
        });
    });

    describe("GetVotingStatus Testing", function() {
        it("Should revert if voting does not exist.", async function () {
            await expect(votingSystem.getVotingStatus(4)).to.be.revertedWith("Voting does not exist.");
        });

        it("Status must be False, if voting is finished.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);
            const threeDays = 3 * 24 * 60 * 60;
    
            await ethers.provider.send('evm_increaseTime', [threeDays]);
            await ethers.provider.send('evm_mine');
    
            await votingSystem.finishVoting(1);
    
            const tx = await votingSystem.getVotingStatus(1);
            const receipt = await tx.wait();
            const event = receipt.events[0];
            await expect(event.args.votingID).to.equal(1);
            await expect(event.args.isActive).to.equal(false);
        });
    });

    describe("GetVotingCandidates Testing", function() {
        it("Should revert if voting does not exist.", async function () {
            await expect(votingSystem.getVotingCandidates(4)).to.be.revertedWith("Voting does not exist.");
        });
    });

    describe("GetCandidateVotes Testing", function() {
        it("Should revert if voting does not exist.", async function () {
            await expect(votingSystem.getCandidateVotes(4, addresses[0].address)).to.be.revertedWith("Voting does not exist.");
        });

        it("Should revert if candidate does not exist.", async function () {
            const candidates = [addresses[0].address, addresses[1].address];
            await votingSystem.createVoting(candidates);

            await expect(votingSystem.getCandidateVotes(1, addresses[2].address)).to.be.revertedWith("Candidate does not exist.");
        });
    });

    describe("WithdrawCreatorFee Testing", function() {
        it("Should revert if creator fee is empty.", async function () {
            await expect(votingSystem.withdrawCreatorFee()).to.be.revertedWith("Nothing to withdraw.");
        });
    });
  });