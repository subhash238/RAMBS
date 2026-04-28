const { createAdapter } = require("@socket.io/redis-adapter");
const redisClient = require("../../../config/redis");
const logger = require("../../../config/logger");
const DragonTigerTournament = require("../models/dragonTigerTournament.model");
const CardJson = require("../../../utils/dragonTigerCard.json");
const BotNames = require("../../../utils/botNames.json");
const {
  Add_User_Socket,
  Delete_User_Socket_By_SocketId,
} = require("../services/socketHelper.service");
const dtRedis = require("../services/dragonTigerRedis.service");

let io = null;

// Helper: Send message to all active players in room
const broadcastToRoom = async (roomId, event, data) => {
  const users = await dtRedis.getAllRoomUsersData(roomId);
  for (const user of users) {
    if (!user.isPingTimeOut && !user.isDisconnect && !user.isDelete) {
      io.to(`dragon-tiger-${user.playerId}`).emit(event, data);
    }
  }
};

// Helper: Send message to single player
const emitToPlayer = (playerId, event, data) => {
  io.to(`dragon-tiger-${playerId}`).emit(event, data);
};

// Send timer response to all active players
const sendTimerResponseDragonTiger = async (roomId, resJson) => {
  const users = await dtRedis.getAllRoomUsersData(roomId);
  for (const user of users) {
    if (!user.isPingTimeOut && !user.isDisconnect && !user.isDelete) {
      io.to(`dragon-tiger-${user.playerId}`).emit("dragon-tiger-res", resJson);
    }
  }
};

// Generate cards for a room using Redis
const generateDragonTigerCards = async (roomId, roundId) => {
  let cardJsonGenerate = [...CardJson];
  let addCards = [];

  for (let j = 0; j < 2; j++) {
    const randomIndex = Math.floor(Math.random() * cardJsonGenerate.length);
    addCards.push(cardJsonGenerate[randomIndex]);
    cardJsonGenerate.splice(randomIndex, 1);
  }

  // Get room details from Redis
  const roomDetails = await dtRedis.getRoomDetails(roomId);
  const botComplexity = roomDetails?.botComplexity || 1;

  // Get round bets from Redis
  const roundBets = await dtRedis.getRoundBets(roomId, roundId);
  let dragonTotalAmount = 0;
  let tigerTotalAmount = 0;
  let tieTotalAmount = 0;

  roundBets.forEach((bet) => {
    if (bet.betType === 0) dragonTotalAmount += bet.amount;
    else if (bet.betType === 1) tigerTotalAmount += bet.amount;
    else if (bet.betType === 2) tieTotalAmount += bet.amount;
  });

  let winNum = -1;

  if (botComplexity === 0) {
    winNum = Math.floor(Math.random() * 3);
    if (winNum === 2) {
      let newWin1 = Math.floor(Math.random() * 30);
      if (newWin1 !== 20) {
        winNum = Math.floor(Math.random() * 2);
      }
    }
  } else if (botComplexity === 1) {
    let randomMediumNumber = Math.floor(Math.random() * 51);
    if (randomMediumNumber % 7 === 0) {
      winNum = calculateWinnerByBets(dragonTotalAmount, tigerTotalAmount, tieTotalAmount);
    } else {
      winNum = Math.floor(Math.random() * 3);
      if (winNum === 2 && Math.floor(Math.random() * 30) !== 20) {
        winNum = Math.floor(Math.random() * 2);
      }
    }
  } else if (botComplexity === 2) {
    winNum = calculateWinnerByBets(dragonTotalAmount, tigerTotalAmount, tieTotalAmount);
    if (winNum === 2 && Math.floor(Math.random() * 100) + 1 % 4 !== 0) {
      winNum = Math.floor(Math.random() * 2);
    }
  }

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
const startRoundTimerStart = async (roomId) => {
  const roomDetails = await dtRedis.getRoomDetails(roomId);
  logger.info(`startRoundTimerStart - Room: ${roomId}, startRoundTimer: ${roomDetails?.startRoundTimer}, status: ${roomDetails?.status}`);

  if (!roomDetails || roomDetails.startRoundTimer) {
    logger.warn(`startRoundTimerStart returning early for room ${roomId}`);
    return;
  }

  // Update room status to start
  await dtRedis.updateRoomStatus(roomId, "start");
  logger.info(`startRoundTimerStart - Room ${roomId} status set to start`);

  let time = parseInt(roomDetails.timer) || 10;

  const dragonTigerStartTimerFun = setInterval(async () => {
    const currentRoom = await dtRedis.getRoomDetails(roomId);
    if (!currentRoom || currentRoom.status !== "start") {
      clearInterval(dragonTigerStartTimerFun);
      return;
    }

    if (time >= 0) {
      const resJson = {
        status: true,
        ev: "start-time-dragon-tiger",
        time,
      };
      await sendTimerResponseDragonTiger(roomId, resJson);
      time -= 1;
    } else {
      clearInterval(dragonTigerStartTimerFun);
      await runDragonTigerRound(roomId);
    }
  }, 1000);
};

// Run the round
const runDragonTigerRound = async (roomId) => {
  const roomDetails = await dtRedis.getRoomDetails(roomId);
  if (!roomDetails) return;

  const callGenerateCardFun = await generateDragonTigerCards(roomId, roomDetails.roundId);

  // Update room with cards and status
  await dtRedis.updateRoomCards(roomId, callGenerateCardFun.card[0], callGenerateCardFun.card[1]);
  await dtRedis.updateRoomStatus(roomId, "run");

  const users = await dtRedis.getAllRoomUsersData(roomId);
  const updatedRoom = await dtRedis.getRoomDetails(roomId);

  const resJson = {
    status: true,
    ev: "run-dragon-tiger",
    users,
    roomMasterData: updatedRoom,
  };

  await broadcastToRoom(roomId, "dragon-tiger-res", resJson);

  setTimeout(async () => {
    await processWinners(callGenerateCardFun.win, roomId);
  }, 3000);
};

// Process winners
const processWinners = async (winNum, roomId) => {
  const roomDetails = await dtRedis.getRoomDetails(roomId);
  if (!roomDetails) return;

  // Add to round history
  await dtRedis.addRoundHistory(roomId, roomDetails.roundId, winNum);

  // Update room status to completed
  await dtRedis.updateRoomStatus(roomId, "completed");

  const users = await dtRedis.getAllRoomUsersData(roomId);

  // Process individual winners
  for (const user of users) {
    let winBalance = 0;
    const userData = await dtRedis.getRoomUserData(roomId, user.playerId);

    if (!userData || userData.isDelete) continue;

    if (winNum === 0 && userData.dragonTotalAmount > 0) {
      winBalance = userData.dragonTotalAmount * 2;
    } else if (winNum === 1 && userData.tigerTotalAmount > 0) {
      winBalance = userData.tigerTotalAmount * 2;
    } else if (winNum === 2 && userData.tieTotalAmount > 0) {
      winBalance = userData.tieTotalAmount * 2;
    }

    if (winBalance > 0) {
      // Broadcast win to player
      const winResJson = {
        status: true,
        ev: "win-player-dragon-tiger",
        playerId: user.playerId,
        winBalance,
        winStatus: winNum === 0 ? "dragon" : winNum === 1 ? "tiger" : "tie",
      };
      emitToPlayer(user.playerId, "dragon-tiger-res", winResJson);
    }
  }

  // Broadcast result to all
  const updatedRoom = await dtRedis.getRoomDetails(roomId);
  const resJson = {
    status: true,
    ev: "dragon-tiger-win",
    win: winNum,
    winStatus: winNum === 0 ? "dragon" : winNum === 1 ? "tiger" : "tie",
    users,
    roomMasterData: updatedRoom,
  };

  await broadcastToRoom(roomId, "dragon-tiger-res", resJson);

  setTimeout(async () => {
    await startNextRound(roomId);
  }, 2000);
};

// Start next round
const startNextRound = async (roomId) => {
  const roomDetails = await dtRedis.getRoomDetails(roomId);
  if (!roomDetails) return;

  // Generate new bot data
  const botData = [];
  for (let i = 1; i < 7; i++) {
    const randomValue = Math.floor(Math.random() * BotNames.length);
    const randomImage = Math.floor(Math.random() * 10);
    botData.push({
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

  // Update room with new bot data and reset for next round
  const newRoundId = roomDetails.roundId + 1;
  await dtRedis.setRoomDetails(roomId, {
    ...roomDetails,
    roundId: newRoundId,
    startRoundTimer: false,
    status: "wait",
    card1: {},
    card2: {},
    botData,
  });

  // Reset all user bets
  await dtRedis.resetUserBets(roomId);

  // Broadcast start round to all users
  const users = await dtRedis.getAllRoomUsersData(roomId);
  const updatedRoom = await dtRedis.getRoomDetails(roomId);

  const resJson = {
    status: true,
    ev: "start-round-dragon-tiger",
    users,
    roomMasterData: updatedRoom,
  };

  await broadcastToRoom(roomId, "dragon-tiger-res", resJson);

  // Check if users are present to continue
  setTimeout(async () => {
    const userCount = await dtRedis.getRoomUserCount(roomId);
    if (userCount > 0) {
      await startRoundTimerStart(roomId);
    } else {
      // No users, keep status as wait
      await dtRedis.updateRoomStatus(roomId, "wait");
    }
  }, 500);
};

// Socket handler with Redis adapter
module.exports = (server) => {
  logger.info("Initializing Dragon Tiger Socket.IO with Redis adapter");

  io = require("socket.io")(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      transports: ["websocket", "polling"],
      credentials: true,
    },
    allowEIO3: true,
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // Setup Redis adapter for multiple instances
  const subClient = redisClient.duplicate();
  (async () => {
    await subClient.connect();
    logger.success("Redis sub client connected for Dragon Tiger");
  })();
  io.adapter(createAdapter(redisClient, subClient));

  io.on("connection", async (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    const userId = socket.handshake.query.user_id;
    const socketId = socket.id;

    // Handle user identification from query params
    if (userId) {
      // Add user to socket helper (global socket tracking)
      await Add_User_Socket({
        user_id: String(userId),
        socket_id: socketId,
        type: socket.handshake.query.type || "user",
      });
      logger.info(`New client connected with user_id: ${userId} and socketId: ${socketId}`);
    }

    // Join Dragon Tiger room
    socket.on("join-dragon-tiger", async (data) => {
      try {
        const { playerId, roomId, playerData } = data;
        socket.join(`dragon-tiger-${playerId}`);

        // Check if room exists in Redis
        let roomDetails = await dtRedis.getRoomDetails(roomId);
        const isFirstPlayer = !roomDetails || (await dtRedis.getRoomUserCount(roomId)) === 0;

        // Add player to Redis room
        await dtRedis.addRoomUser(roomId, playerId, {
          playerData: playerData || {},
          activeRoundId: isFirstPlayer ? 0 : roomDetails.roundId,
        });

        // Initialize room if first player
        if (isFirstPlayer) {
          const tournament = await DragonTigerTournament.findOne({
            where: { isActive: true },
          });

          // Generate bot data
          const botData = [];
          for (let i = 1; i < 7; i++) {
            const randomValue = Math.floor(Math.random() * BotNames.length);
            const randomImage = Math.floor(Math.random() * 10);
            botData.push({
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

          // Set room details in Redis with status "start" (betting open immediately)
          await dtRedis.setRoomDetails(roomId, {
            roomId,
            status: "start",
            roundId: 1,
            roundHistory: [],
            startRoundTimer: false,
            continueTimer: false,
            card1: {},
            card2: {},
            botComplexity: tournament?.botComplexity || 1,
            timer: tournament?.timer || 10,
            botData,
            is_delete: false,
          });

          // Check room status - always ensure status is start when users join
          const userCount = await dtRedis.getRoomUserCount(roomId);
          const currentRoom = await dtRedis.getRoomDetails(roomId);
          logger.info(`Join handler - Room: ${roomId}, UserCount: ${userCount}, isFirstPlayer: ${isFirstPlayer}, CurrentStatus: ${currentRoom?.status}`);

          if (userCount > 0 && currentRoom?.status !== "start") {
            logger.info(`Starting timer for room ${roomId}`);
            // Change status from wait to start and begin timer
            await dtRedis.updateRoomStatus(roomId, "start");
            logger.info(`Room ${roomId} status updated to start`);

            // Broadcast that betting is now open
            const roomData = await dtRedis.getRoomDetails(roomId);
            const startResJson = {
              status: true,
              ev: "status-change-dragon-tiger",
              roomId,
              status: "start",
              message: "Betting is now open!",
              roomMasterData: roomData,
            };
            await broadcastToRoom(roomId, "dragon-tiger-res", startResJson);

            await startRoundTimerStart(roomId);
          } else if (userCount > 0 && currentRoom?.status === "start") {
            // Room already in start status, just ensure timer is running
            logger.info(`Room ${roomId} already in start status`);
            await startRoundTimerStart(roomId);
          } else {
            logger.warn(`Room ${roomId} has 0 users, not starting timer`);
          }
        }

        // Get updated data for broadcast (status already updated to start above)
        const users = await dtRedis.getAllRoomUsersData(roomId);
        const updatedRoom = await dtRedis.getRoomDetails(roomId);

        // Broadcast join event to all users
        const resJson = {
          status: true,
          ev: "join-dragon-tiger",
          roomId,
          users,
          roomMasterData: updatedRoom,
        };

        await broadcastToRoom(roomId, "dragon-tiger-res", resJson);

        // Confirm to joining player
        socket.emit("dragon-tiger-res", {
          status: true,
          ev: "join-confirmation",
          message: "Joined room successfully",
          roomId,
        });
      } catch (err) {
        logger.error(`Error joining room: ${err.message}`);
        socket.emit("dragon-tiger-res", {
          status: false,
          ev: "join-error",
          error: err.message,
        });
      }
    });

    // Place bet
    socket.on("bet-dragon-tiger", async (data) => {
      try {
        const { playerId, roomId, roundId, amount, betType } = data;

        // Check room status - only allow bets when status is "start"
        const roomDetails = await dtRedis.getRoomDetails(roomId);
        logger.info(`Bet attempt - Room: ${roomId}, Status: ${roomDetails?.status}, Player: ${playerId}`);

        if (!roomDetails) {
          socket.emit("dragon-tiger-res", {
            status: false,
            ev: "bet-error",
            message: "Room not found",
          });
          return;
        }

        if (roomDetails.status !== "start") {
          socket.emit("dragon-tiger-res", {
            status: false,
            ev: "bet-error",
            message: `Betting closed - Room status is: ${roomDetails.status}`,
          });
          return;
        }

        // Store bet in Redis
        await dtRedis.storeBet(roomId, roundId, playerId, {
          playerId,
          amount,
          betType,
        });

        // Update user totals in Redis
        await dtRedis.updateUserBet(roomId, playerId, betType, amount);

        // Broadcast bet to all users
        const broadcastResJson = {
          status: true,
          ev: "bet-dragon-tiger",
          bet: {
            playerId,
            amount,
            betType,
            roundId,
          },
        };
        await broadcastToRoom(roomId, "dragon-tiger-res", broadcastResJson);

        // Confirm to betting player
        const resJson = {
          status: true,
          ev: "bet-confirmation",
          bet: data,
        };
        socket.emit("dragon-tiger-res", resJson);
      } catch (err) {
        logger.error(`Error placing bet: ${err.message}`);
        socket.emit("dragon-tiger-res", {
          status: false,
          ev: "bet-error",
          error: err.message,
        });
      }
    });

    // Exit room
    socket.on("exit-dragon-tiger", async (data) => {
      try {
        const { playerId, roomId } = data;
        await dtRedis.markUserDeleted(roomId, playerId);
        socket.leave(`dragon-tiger-${playerId}`);

        // Check if any users left in room
        const userCount = await dtRedis.getRoomUserCount(roomId);
        if (userCount === 0) {
          await dtRedis.updateRoomStatus(roomId, "wait");
        }

        // Broadcast exit
        const users = await dtRedis.getAllRoomUsersData(roomId);
        const updatedRoom = await dtRedis.getRoomDetails(roomId);

        const resJson = {
          status: true,
          ev: "exit-dragon-tiger",
          playerId,
          users,
          roomMasterData: updatedRoom,
        };
        await broadcastToRoom(roomId, "dragon-tiger-res", resJson);
      } catch (err) {
        logger.error(`Error exiting room: ${err.message}`);
      }
    });

    // Get room status
    socket.on("get-room-status", async (data) => {
      try {
        const { roomId } = data;
        const roomDetails = await dtRedis.getRoomDetails(roomId);
        socket.emit("dragon-tiger-res", {
          status: true,
          ev: "room-status",
          roomId,
          roomMasterData: roomDetails,
        });
      } catch (err) {
        logger.error(`Error getting room status: ${err.message}`);
      }
    });

    // Handle disconnect
    socket.on("disconnect", async (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);

      // Remove from global socket tracking
      await Delete_User_Socket_By_SocketId(socket.id);

      // Find and remove from any dragon tiger rooms
      const rooms = await dtRedis.getActiveRooms();
      for (const roomId of rooms) {
        const users = await dtRedis.getRoomUsers(roomId);
        for (const userId of users) {
          const userData = await dtRedis.getRoomUserData(roomId, userId);
          if (userData && userData.playerData?.socketId === socket.id) {
            await dtRedis.markUserDeleted(roomId, userId);
            logger.info(`Removed user ${userId} from room ${roomId} due to disconnect`);
            break;
          }
        }
      }
    });
  });

  return io;
};
