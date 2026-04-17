const DragonTigerTournament = require("../models/dragonTigerTournament.model");
const DragonTigerRoom = require("../models/dragonTigerRoom.model");
const DragonTigerRoomJoin = require("../models/dragonTigerRoomJoin.model");
const DragonTigerBet = require("../models/dragonTigerBet.model");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const CardJson = require("../../../utils/dragonTigerCard.json");
const BotNames = require("../../../utils/botNames.json");

// Global room data storage
const RoomMasterDataDragonTiger = {
  roomId: "833333",
  roomMasterData: {},
  users: [],
  winAmountHistorySaveDT: [],
  infiniteDragonTigerUserBetData: [],
  cutAmountHistorySaveDT: [],
};

// Helper functions
const FindRoomUsersIndexDragonTiger = (playerId) => {
  return RoomMasterDataDragonTiger.users.findIndex(
    (item) => item.playerId === playerId
  );
};

const SendAllPlayerMessageDragonTiger = async (getRoomPlayer, resjson, io) => {
  if (getRoomPlayer.length !== 0) {
    for (const fetchData of getRoomPlayer) {
      if (
        !fetchData.isPingTimeOut &&
        !fetchData.isDisconnect &&
        !fetchData.isDelete
      ) {
        // Emit to socket room
        io.to(`dragon-tiger-${fetchData.playerId}`).emit(
          "dragon-tiger-res",
          resjson
        );
      }
    }
  }
};

const SendSinglePlayerResDragonTiger = async (playerId, resjson, io) => {
  io.to(`dragon-tiger-${playerId}`).emit("dragon-tiger-res", resjson);
};

const sendTimerResponseDragonTiger = async (getRoomPlayer, resJson, io) => {
  if (getRoomPlayer.length !== 0) {
    for (const fetchData of getRoomPlayer) {
      if (
        !fetchData.isPingTimeOut &&
        !fetchData.isDisconnect &&
        !fetchData.isDelete
      ) {
        io.to(`dragon-tiger-${fetchData.playerId}`).emit(
          "dragon-tiger-res",
          resJson
        );
      }
    }
  }
};

// Generate cards
const generateDragonTigerCards = async () => {
  let cardJsonGenerate = [...CardJson];
  let addCards = [];

  for (let j = 0; j < 2; j++) {
    const randomIndex = Math.floor(Math.random() * cardJsonGenerate.length);
    addCards.push(cardJsonGenerate[randomIndex]);
    cardJsonGenerate.splice(randomIndex, 1);
  }

  const botComplexity = RoomMasterDataDragonTiger.roomMasterData.botComplexity || 1;

  // Calculate total amounts for each bet type
  let dragonTotalAmount = 0;
  let tigerTotalAmount = 0;
  let tieTotalAmount = 0;

  const amountTotal = {};
  RoomMasterDataDragonTiger.infiniteDragonTigerUserBetData.forEach((item) => {
    const key = `${item.betType}_${item.roundId}_${item.roomId}`;
    if (!amountTotal[key]) {
      amountTotal[key] = item.amount;
    } else {
      amountTotal[key] += item.amount;
    }
  });

  for (const key in amountTotal) {
    if (amountTotal.hasOwnProperty(key)) {
      const [betType] = key.split("_");
      if (betType == 0) {
        dragonTotalAmount += parseFloat(amountTotal[key]);
      } else if (betType == 1) {
        tigerTotalAmount += parseFloat(amountTotal[key]);
      } else if (betType == 2) {
        tieTotalAmount += parseFloat(amountTotal[key]);
      }
    }
  }

  let winNum = -1;

  // Bot complexity logic
  if (botComplexity === 0) {
    // Easy - Random
    winNum = Math.floor(Math.random() * 3);
    if (winNum === 2) {
      let newWin1 = Math.floor(Math.random() * 30);
      if (newWin1 !== 20) {
        winNum = Math.floor(Math.random() * 2);
      }
    }
  } else if (botComplexity === 1) {
    // Medium
    let randomMediumNumber = Math.floor(Math.random() * 51);
    if (randomMediumNumber % 7 === 0) {
      // Hard logic (sometimes)
      winNum = calculateWinnerByBets(dragonTotalAmount, tigerTotalAmount, tieTotalAmount);
    } else {
      // Easy logic
      winNum = Math.floor(Math.random() * 3);
      if (winNum === 2 && Math.floor(Math.random() * 30) !== 20) {
        winNum = Math.floor(Math.random() * 2);
      }
    }
  } else if (botComplexity === 2) {
    // Hard - Always favor house
    winNum = calculateWinnerByBets(dragonTotalAmount, tigerTotalAmount, tieTotalAmount);
    if (winNum === 2 && Math.floor(Math.random() * 100) + 1 % 4 !== 0) {
      winNum = Math.floor(Math.random() * 2);
    }
  }

  // Manipulate cards based on winner
  if (winNum === 0) {
    addCards = addCards.sort((a, b) => a.cardNum - b.cardNum);
    if (addCards[0].cardNum === addCards[1].cardNum && addCards[0].cardNum > 2) {
      addCards[1].cardNum = addCards[0].cardNum - 1;
    } else {
      addCards[0].cardNum = addCards[0].cardNum + 1;
    }
  } else if (winNum === 1) {
    addCards = addCards.sort((a, b) => b.cardNum - a.cardNum);
    if (addCards[1].cardNum === addCards[0].cardNum && addCards[1].cardNum > 2) {
      addCards[0].cardNum = addCards[1].cardNum - 1;
    } else {
      addCards[1].cardNum = addCards[1].cardNum + 1;
    }
  } else if (winNum === 2) {
    addCards[1].cardNum = addCards[0].cardNum;
    addCards[1].cardColor = addCards[0].cardColor === 3 ? 0 : addCards[0].cardColor + 1;
  }

  // Determine final winner
  if (addCards[0].cardNum === addCards[1].cardNum) {
    return { card: addCards, win: 2 };
  } else if (addCards[0].cardNum > addCards[1].cardNum) {
    return { card: addCards, win: 0 };
  } else {
    return { card: addCards, win: 1 };
  }
};

const calculateWinnerByBets = (dragonTotal, tigerTotal, tieTotal) => {
  if (dragonTotal === tigerTotal && tigerTotal === tieTotal) {
    return Math.floor(Math.random() * 3);
  } else if (dragonTotal >= tigerTotal && dragonTotal >= tieTotal) {
    return tigerTotal >= tieTotal ? 2 : 1;
  } else if (tigerTotal >= dragonTotal && tigerTotal >= tieTotal) {
    return dragonTotal >= tieTotal ? 2 : 0;
  } else {
    return dragonTotal >= tigerTotal ? 1 : 0;
  }
};

// Round timer
const startRoundTimerStart = async (roomId, io) => {
  if (RoomMasterDataDragonTiger.roomMasterData.startRoundTimer) return;

  let time = parseInt(RoomMasterDataDragonTiger.roomMasterData.timer) || 10; // 10 seconds betting time
  RoomMasterDataDragonTiger.roomMasterData.startRoundTimer = true;
  RoomMasterDataDragonTiger.roomMasterData.continueTimer = true;
  RoomMasterDataDragonTiger.roomMasterData.status = "start"; // Betting open

  const dragonTigerStartTimerFun = setInterval(async () => {
    if (time >= 0 && RoomMasterDataDragonTiger.roomMasterData.startRoundTimer) {
      const resJson = {
        status: true,
        ev: "start-time-dragon-tiger",
        time,
      };
      time -= 1;
      await sendTimerResponseDragonTiger(RoomMasterDataDragonTiger.users, resJson, io);
    } else {
      clearInterval(dragonTigerStartTimerFun);
      if (time < 0) {
        await runDragonTigerRound(roomId, io);
      }
    }
  }, 1000);
};

// Run the round
const runDragonTigerRound = async (roomId, io) => {
  const callGenerateCardFun = await generateDragonTigerCards();

  RoomMasterDataDragonTiger.roomMasterData.startRoundTimer = false;
  RoomMasterDataDragonTiger.roomMasterData.status = "run"; // Betting closed, showing cards
  RoomMasterDataDragonTiger.roomMasterData.card1 = callGenerateCardFun.card[0];
  RoomMasterDataDragonTiger.roomMasterData.card2 = callGenerateCardFun.card[1];

  const resJson = {
    status: true,
    ev: "run-dragon-tiger",
    users: RoomMasterDataDragonTiger.users,
    roomMasterData: RoomMasterDataDragonTiger.roomMasterData,
  };

  await SendAllPlayerMessageDragonTiger(RoomMasterDataDragonTiger.users, resJson, io);
  RoomMasterDataDragonTiger.infiniteDragonTigerUserBetData = [];

  // Process winners after delay
  setTimeout(async () => {
    await processWinners(callGenerateCardFun.win, roomId, io);
  }, 3000);
};

// Process winners
const processWinners = async (winNum, roomId, io) => {
  // Update round history
  RoomMasterDataDragonTiger.roomMasterData.roundHistory.push({
    roundId: RoomMasterDataDragonTiger.roomMasterData.roundId,
    roundValue: winNum,
  });

  if (RoomMasterDataDragonTiger.roomMasterData.roundHistory.length > 100) {
    RoomMasterDataDragonTiger.roomMasterData.roundHistory.shift();
  }

  RoomMasterDataDragonTiger.roomMasterData.status = "completed"; // Winner announced

  // Calculate and distribute winnings
  for (let i = 0; i < RoomMasterDataDragonTiger.users.length; i++) {
    let winBalance = 0;
    const user = RoomMasterDataDragonTiger.users[i];

    if (winNum === 0 && user.dragonTotalAmount > 0) {
      winBalance = user.dragonTotalAmount * 2;
    } else if (winNum === 1 && user.tigerTotalAmount > 0) {
      winBalance = user.tigerTotalAmount * 2;
    } else if (winNum === 2 && user.tieTotalAmount > 0) {
      winBalance = user.tieTotalAmount * 2;
    }

    if (winBalance > 0) {
      // Update player balance here
      const resJson = {
        status: true,
        ev: "infinite-update-player-balance",
        winBalance,
      };
      await SendSinglePlayerResDragonTiger(user.playerId, resJson, io);
    }
  }

  const resJson = {
    status: true,
    ev: "dragon-tiger-win",
    win: winNum,
    users: RoomMasterDataDragonTiger.users,
    roomMasterData: RoomMasterDataDragonTiger.roomMasterData,
  };

  await SendAllPlayerMessageDragonTiger(RoomMasterDataDragonTiger.users, resJson, io);

  // Start next round after delay
  setTimeout(async () => {
    await startNextRound(roomId, io);
  }, 2000);
};

// Start next round
const startNextRound = async (roomId, io) => {
  // Reset bot data
  RoomMasterDataDragonTiger.roomMasterData.botData = [];
  for (let i = 1; i < 7; i++) {
    const randomValue = Math.floor(Math.random() * BotNames.length);
    const randomImage = Math.floor(Math.random() * 10);
    RoomMasterDataDragonTiger.roomMasterData.botData.push({
      roomId,
      playerId: `bot${i}`,
      playerData: {
        email: `bot${i}`,
        phoneNo: `bot${i}`,
        playerName: BotNames[randomValue],
        imageUrl: randomImage,
      },
    });
  }

  const resJson = {
    status: true,
    ev: "start-round-dragon-tiger",
    users: RoomMasterDataDragonTiger.users,
    roomMasterData: RoomMasterDataDragonTiger.roomMasterData,
  };

  await SendAllPlayerMessageDragonTiger(RoomMasterDataDragonTiger.users, resJson, io);

  setTimeout(async () => {
    RoomMasterDataDragonTiger.roomMasterData.roundId += 1;
    RoomMasterDataDragonTiger.roomMasterData.startRoundTimer = false;
    RoomMasterDataDragonTiger.roomMasterData.status = "waiting"; // Ready for next round
    RoomMasterDataDragonTiger.roomMasterData.card1 = { cardNum: "", cardValue: "", cardColor: "" };
    RoomMasterDataDragonTiger.roomMasterData.card2 = { cardNum: "", cardValue: "", cardColor: "" };

    // Reset user bet amounts
    for (let i = 0; i < RoomMasterDataDragonTiger.users.length; i++) {
      RoomMasterDataDragonTiger.users[i].dragonTotalAmount = 0;
      RoomMasterDataDragonTiger.users[i].tigerTotalAmount = 0;
      RoomMasterDataDragonTiger.users[i].tieTotalAmount = 0;
    }

    if (RoomMasterDataDragonTiger.users.length > 0) {
      await startRoundTimerStart(roomId, io);
    }
  }, 500);
};

// Main exports
exports.getTournament = async (req, res) => {
  try {
    const tournament = await DragonTigerTournament.findOne({
      where: { isActive: true },
    });

    if (!tournament) {
      return error(res, "No active tournament found", 404);
    }

    return success(res, "Tournament retrieved successfully", { tournament });
  } catch (err) {
    logger.error(`Error fetching tournament: ${err.message}`);
    return error(res, "Failed to fetch tournament", 500);
  }
};

exports.getRoomData = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await DragonTigerRoom.findOne({
      where: { roomId },
    });

    if (!room) {
      return error(res, "Room not found", 404);
    }

    const users = await DragonTigerRoomJoin.findAll({
      where: { roomId, isDelete: false },
    });

    return success(res, "Room data retrieved", {
      room,
      users,
      globalData: RoomMasterDataDragonTiger,
    });
  } catch (err) {
    logger.error(`Error fetching room: ${err.message}`);
    return error(res, "Failed to fetch room", 500);
  }
};

// Socket event handlers
exports.handleSocketEvents = (io) => {
  io.on("connection", (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join Dragon Tiger room
    socket.on("join-dragon-tiger", async (data) => {
      try {
        const { playerId, roomId } = data;
        socket.join(`dragon-tiger-${playerId}`);

        // Add player to room data
        const existingIndex = FindRoomUsersIndexDragonTiger(playerId);
        if (existingIndex === -1) {
          RoomMasterDataDragonTiger.users.push({
            roomId,
            playerId,
            playerData: data.playerData || {},
            dragonTotalAmount: 0,
            tigerTotalAmount: 0,
            tieTotalAmount: 0,
            isDelete: false,
            isPending: true,
            isDisconnect: false,
            isPingTimeOut: false,
            activeRoundId: RoomMasterDataDragonTiger.roomMasterData.roundId || 0,
          });
        }

        // Initialize room if first player
        if (RoomMasterDataDragonTiger.users.length === 1) {
          const tournament = await DragonTigerTournament.findOne({
            where: { isActive: true },
          });

          RoomMasterDataDragonTiger.roomMasterData = {
            roomId,
            status: 0,
            roundId: 1,
            roundHistory: [],
            startRoundTimer: false,
            continueTimer: false,
            card1: {},
            card2: {},
            botComplexity: tournament?.botComplexity || 1,
            timer: tournament?.timer || 20,
            botData: [],
          };

          // Generate bot data
          for (let i = 1; i < 7; i++) {
            const randomValue = Math.floor(Math.random() * BotNames.length);
            const randomImage = Math.floor(Math.random() * 10);
            RoomMasterDataDragonTiger.roomMasterData.botData.push({
              roomId,
              playerId: `bot${i}`,
              playerData: {
                email: `bot${i}`,
                phoneNo: `bot${i}`,
                playerName: BotNames[randomValue],
                imageUrl: randomImage,
              },
            });
          }

          await startRoundTimerStart(roomId, io);
        }

        const resJson = {
          status: true,
          ev: "join-dragon-tiger",
          roomId,
          users: RoomMasterDataDragonTiger.users,
          roomMasterData: RoomMasterDataDragonTiger.roomMasterData,
        };

        await SendAllPlayerMessageDragonTiger(RoomMasterDataDragonTiger.users, resJson, io);
      } catch (err) {
        logger.error(`Error joining room: ${err.message}`);
      }
    });

    // Place bet
    socket.on("bet-dragon-tiger", async (data) => {
      try {
        const { playerId, roomId, roundId, amount, betType } = data;

        // Store bet
        RoomMasterDataDragonTiger.infiniteDragonTigerUserBetData.push({
          roomId,
          playerId,
          roundId,
          amount,
          betType,
        });

        // Update user totals
        const userIndex = FindRoomUsersIndexDragonTiger(playerId);
        if (userIndex > -1) {
          if (betType === 0) {
            RoomMasterDataDragonTiger.users[userIndex].dragonTotalAmount += amount;
          } else if (betType === 1) {
            RoomMasterDataDragonTiger.users[userIndex].tigerTotalAmount += amount;
          } else if (betType === 2) {
            RoomMasterDataDragonTiger.users[userIndex].tieTotalAmount += amount;
          }
        }

        // Deduct balance and save history here

        const resJson = {
          status: true,
          ev: "bet-confirmation",
          bet: data,
        };

        socket.emit("dragon-tiger-res", resJson);
      } catch (err) {
        logger.error(`Error placing bet: ${err.message}`);
      }
    });

    // Exit room
    socket.on("exit-dragon-tiger", async (data) => {
      try {
        const { playerId } = data;
        for (let i = 0; i < RoomMasterDataDragonTiger.users.length; i++) {
          if (RoomMasterDataDragonTiger.users[i].playerId === playerId) {
            RoomMasterDataDragonTiger.users[i].isDelete = true;
          }
        }
      } catch (err) {
        logger.error(`Error exiting room: ${err.message}`);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};

// Bot random bet
const sendRandomBetByBot = async (io) => {
  if (!RoomMasterDataDragonTiger.roomMasterData.startRoundTimer) return;

  const randomBotName = Math.floor(Math.random() * 6);
  const randomNumber = Math.floor(Math.random() * 5);
  const randomBetType = Math.floor(Math.random() * 3);
  const randomAmount = Math.floor(Math.random() * 5);
  const amountArray = [10, 50, 100, 500, 1000];

  const dataArray = [];
  for (let i = 0; i < randomNumber; i++) {
    dataArray.push({
      amount: amountArray[randomAmount],
      betType: randomBetType,
      name: RoomMasterDataDragonTiger.roomMasterData.botData[randomBotName]?.playerData?.playerName || "Bot",
    });
  }

  const resJson = {
    status: true,
    ev: "bot-bet-dragon-tiger",
    data: dataArray,
  };

  await SendAllPlayerMessageDragonTiger(RoomMasterDataDragonTiger.users, resJson, io);
};

module.exports.RoomMasterDataDragonTiger = RoomMasterDataDragonTiger;
