var DeviceData = function(maxLength, frameLength) {
    // 初始化变量
    this.maxLength = maxLength == null ? 600000 : maxLength; // 最多记录600000组数据, 约10分钟, 81.6MB
    this.frameLength = frameLength == null ? 40 : frameLength; // 每组数据40个float类型
    this.buffer = new ArrayBuffer(this.maxLength * this.frameLength * 4);
    this.floatView = new Float32Array(this.buffer);
    this.length = 0;
    this.time = 0;
    // 添加数帧数据
    this.push = function(data) {
        if (this.length < this.maxLength - 1) {
            var new_data = new Float32Array(data);
            var int32_data = new Int32Array(data);
            if (new_data.length % this.frameLength != 0) {
                throw("DeviceData.push(data) bad data");
            } 
            var frameCount = new_data.length / this.frameLength;
            for (var n = 0; n < frameCount; n++) {
                var check_sum = 0;
                var sum = int32_data[(n+1)*this.frameLength-1];
                for (var i = 0; i < this.frameLength - 1; i++) {
                    check_sum ^= int32_data[n*this.frameLength+i];
                }
                if (sum != check_sum) {
                    console.log("DeviceData.push(data) bad check_sum", check_sum, sum);
                }
            }
            if (new_data[0] < this.time) {
                console.log("remote device restart!!!");
                this.length = 0;
            }
            this.floatView.set(new_data, this.length * this.frameLength);
            this.length += new_data.length / this.frameLength;
            this.time = this.floatView[(this.length - 1) * this.frameLength];
        } else {
            throw("DeviceData.push(data) buffer full");
        }
    }
    // 获取数据
    this.get = function(index) {
        if (index < 0) {
            index += this.length;
        }
        if (index >= this.length || index < 0) {
            //console.log("DeviceData.get(index) out of range", index);
            return null;
        }
        var floatView = new Float32Array(this.buffer, this.frameLength * 4 * index, this.frameLength);
        floatView.index =           index;
        floatView.time =            floatView[0];
        floatView.rate =            [floatView[1], floatView[2], floatView[3]];
        floatView.gravity =         [floatView[4], floatView[5], floatView[6]];
        floatView.magnetic =        [floatView[7], floatView[8], floatView[9]];
        floatView.wheelSpeed =      [floatView[10], floatView[11], floatView[12]];
        floatView.euler =           [floatView[13], floatView[14], floatView[15]];
        floatView.duty =            [floatView[16], floatView[17]];
        floatView.encoderYaw =      floatView[18];
        floatView.accelerationChip= [floatView[19], floatView[20], floatView[21]];
        floatView.accelerationCar = [floatView[22], floatView[23], floatView[24]];
        floatView.speed =           [floatView[25], floatView[26], floatView[27]];
        floatView.position =        [floatView[28], floatView[29], floatView[30]];
        floatView.positionEncoder = [floatView[31], floatView[32], floatView[33]];
        floatView.positionEcdYaw =  [floatView[34], floatView[35], floatView[36]];
        floatView.isStanStill =     floatView[37] >= 0.5 ? true : false;
        floatView.isTilt =          floatView[38] >= 0.5 ? true : false;
        floatView.isSkid =          floatView[39] >= 0.5 ? true : false;
        return floatView;
    }
    // 寻找指定时间后的第一个样本
    this.findAfter = function(time, start_index) {
        for (var i = start_index == null ? 0 : start_index; i < this.length; i++) {
            if (this.floatView[i * this.frameLength] > time) {
                return this.get(i);
            }
        }
        return null;
    }
    // 计算指定时间段, 指定列数据的最大最小值=[min,max]
    this.statsRange = function(index_array, start_time, end_time) {
        var res = [null, null];
        for (var data = this.findAfter(start_time); 
            data != null && (data.time < end_time || end_time == null); 
            data = this.findAfter(0, data.index+1)) 
        {
            for (index in index_array) {
                var index = index_array[index];
                if (res[0] == null || res[0] > data[index]) res[0] = data[index];
                if (res[1] == null || res[1] < data[index]) res[1] = data[index];
            }
        }
        return res;
    }
    // 导出excel, xlsx
    this.exportXLSX = function() {
        if (this.length == 0)
            return;
        var date = new Date();
        var timestr = date.getFullYear().toString();
        timestr += date.getMonth() >= 9 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1);
        timestr += date.getDate() >= 10 ? date.getDate(): "0" + date.getDate();
        timestr += "_";
        timestr += date.getHours() >= 10 ? date.getHours(): "0" + date.getHours();
        timestr += date.getMinutes() >= 10 ? date.getMinutes(): "0" + date.getMinutes();
        timestr += date.getSeconds() >= 10 ? date.getSeconds(): "0" + date.getSeconds();

        var columns = [];
        for (var i = 0; i < 26; i++) {
            columns.push(String.fromCharCode(65+i))
        }
        for (var i = 0; i < 26; i++) {
            columns.push("A" + String.fromCharCode(65+i))
        }
        var wb = {
            SheetNames: ['数据'],
            Sheets: {
                '数据': {
                    '!ref': 'A1:' + columns[this.frameLength-1] + this.length, // 必须要有这个范围才能输出，否则导出的 excel 会是一个空表
                }
            }
        }
        for (var i = 0; i < this.length; i++) {
            for (var c = 0; c < this.frameLength; c++) {
                wb.Sheets['数据'][columns[c]+(i+1)] = {
                    v: this.floatView[i*this.frameLength+c], 
                }
            }
        }
        /* bookType can be 'xlsx' or 'xlsm' or 'xlsb' */
        var wopts = { bookType:'xlsx', bookSST:false, type:'binary' };

        var wbout = XLSX.write(wb, wopts);

        function s2ab(s) {
          var buf = new ArrayBuffer(s.length);
          var view = new Uint8Array(buf);
          for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
          return buf;
        }

        /* the saveAs call downloads a file on the local machine */
        saveAs(new Blob([s2ab(wbout)],{type:""}), "导出数据_" + timestr + ".xlsx")
    }
    
};

