const express = require('express');
const path = require('path');
var app = express();
var server = app.listen(3000, function() {
    console.log('Server is running on port 3000');
});

const io = require("socket.io")(server, {
  allowEIO3: true 
});

app.use(express.static(path.join(__dirname, "")));
var userConnections = [];
io.on('connection', (socket) => {
    console.log('A user connected ', socket.id);
   console.log("User connected", socket.id);

  socket.on("userconnect", data => {
    const { displayName, meetingid } = data;

    // 1) Join room theo meeting
    socket.join(meetingid);

    // 2) Lấy danh sách những người đã có trong room (trừ chính socket này)
    const clients = Array.from(io.sockets.adapter.rooms.get(meetingid) || [])
      .filter(id => id !== socket.id);

    // 3) Cho user mới biết ai đang có mặt
    const otherUsersInfo = clients.map(id => {
      // bạn cần lưu map từ socketId -> userName đâu đó (ví dụ userConnections)
      const u = userConnections.find(u => u.connectionId === id);
      return { user_id: u.user_id, connectionId: id };
    });
    socket.emit("inform_me_about_other_user", otherUsersInfo);

    // 4) Thông báo cho những client cũ là có người mới join
    socket.to(meetingid).emit("inform_others_about_me", {
      other_user_id: displayName,
      connId: socket.id
    });

    // 5) Lưu thông tin mapping socketId -> user
    userConnections.push({
      connectionId: socket.id,
      user_id: displayName,
      meeting_id: meetingid
    });
  });

  socket.on("SDPProcess", (data) => {
      socket.to(data.to_connid).emit("SDPProcess", {
          message: data.message,
          from_connid: socket.id,
      });
  });

  socket.on("disconnect", () => {
    var disUser = userConnections.find((p) => p.connectionId === socket.id);
    if(disUser) {
      var meetingId = disUser.meeting_id;
      userConnections = userConnections.filter((p) => p.connectionId !== socket.id);
      var list = userConnections.filter((p) => p.meeting_id === meetingId);
      list.forEach((p) => {
        socket.to(p.connectionId).emit("inform_other_about_disconnected_user", {
          connId: socket.id,
        });
      });
    }
  })
});