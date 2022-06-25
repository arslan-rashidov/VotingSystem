require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require('dotenv').config()

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    }, 
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [`${process.env.PRIVATE_KEY.toString()}`]
     }
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "/Users/arslanrashidov/Desktop/VotingSystem/test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 3000000
  }
}
