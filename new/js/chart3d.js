
// 四舍五入到指定位数
function myround(x, n) {
    var y = Math.pow(10, n);
    if (n <= 0) {
        return Number((Math.round(x / y) * y).toFixed(-n));
    } else {
        return Number(Math.round(x / y) * y.toFixed(0));
    }
}

// 根据给定的分段数n, 计算区间a~b合适的间隔点
function calcInterval(a, b, n) {
    var i = (b - a) / n;
    var log10 = Math.log(10);
    var base1 = 0;
    var base2 = Math.log(2) / log10;
    var base5 = Math.log(5) / log10;
    var base10 = 1;
    var pow = Math.floor(Math.log(i) / log10);
    var compare = (Math.log(i) / log10) - pow;
    var min = 1;
    var base;
    if (Math.abs(compare - base1) < min) {base = 1; min = Math.abs(compare - base1);}
    if (Math.abs(compare - base2) < min) {base = 2; min = Math.abs(compare - base2);}
    if (Math.abs(compare - base5) < min) {base = 5; min = Math.abs(compare - base5);}
    if (Math.abs(compare - base10) < min) {base = 10; min = Math.abs(compare - base10);}
    var interval = base * Math.pow(10, pow);
    var ret = [];
    for (var v = Math.ceil(a / interval) * interval; 
        myround(v, pow) <= myround((Math.floor(b / interval) * interval), pow); 
        v += interval) 
    {
        v = myround(v, pow);
        ret.push(v);
    }
    //console.log(a,b,n);
    return ret;
}

function deleteMesh(x) {
    if (x != null) {
        if (x.geometry != null) {
            x.geometry.dispose(); 
        }
        if (x.material != null) {
            x.material.dispose(); 
        }
        if (x.texture != null) {
            x.texture.dispose(); 
        }
    }
}

var BasePlot2D = function(domElement, xmin, xmax, ymin, ymax, xInterval, yInterval) {
    // 初始化THREE
    this.domElement = $(domElement);
    this.width = this.domElement.width();
    this.height = this.domElement.height();
    this.renderer = new THREE.WebGLRenderer({
        antialias: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.domElement.append(this.renderer.domElement);
    this.renderer.setClearColor(0xFFFFFF, 1.0);
    // 初始化相机
    this.label = {x: 40, y: 20, w: 0, h: 0};    // 预留左侧40px以及底部20px为刻度
    this.canvas = {x: 0, y: 0, w: 1, h: 1, top: this.domElement.position().top, left: this.domElement.position().left + this.label.x};
    this.canvas.x = this.width - this.label.x;
    this.canvas.y = this.height - this.label.y;
    this.label.w = this.label.x / this.canvas.x;
    this.label.h = this.label.y / this.canvas.y;
    this.camera = new THREE.OrthographicCamera(-this.label.w, 1, 1, -this.label.h, 1, 1000);
    this.camera.position.set(0, 0, 5);
    // 初始化场景
    this.scene = new THREE.Scene();
    // 初始化画布背景
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: 0xF7F7F7}));
    this.mesh.position.set(0.5, 0.5, 0);
    this.scene.add(this.mesh);
    // 初始化变量
    this.xmin = xmin == null ? 0 : xmin;
    this.xmax = xmax == null ? 1 : xmax;
    this.ymin = ymin == null ? 0 : ymin;
    this.ymax = ymax == null ? 1 : ymax;
    this.xInterval = xInterval == null ? 10 : xInterval;;
    this.yInterval = yInterval == null ? 10 : yInterval;;
    // 初始化网格
    // X轴
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.xInterval * 3 * 4 * 3), 3));
    this.xGrid = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: new THREE.Color(0xCCCCCC)}));
    this.xGrid.pointNum = 0;
    this.xGrid.geometry.setDrawRange(0, this.xGrid.pointNum);
    this.scene.add(this.xGrid);
    // Y轴
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.yInterval * 3 * 4 * 3), 3));
    this.yGrid = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: new THREE.Color(0xCCCCCC)}));
    this.yGrid.pointNum = 0;
    this.yGrid.geometry.setDrawRange(0, this.yGrid.pointNum);
    this.scene.add(this.yGrid);
    // 坐标网格绘制函数
    this.drawGrid = function(axis) {
        var grid = axis == "x" ? this.xGrid : this.yGrid;
        var min = axis == "x" ? this.xmin : this.ymin;
        var max = axis == "x" ? this.xmax : this.ymax;
        var interval = axis == "x" ? this.xInterval : this.yInterval;
        var parent = this.domElement;
        
        if (min >= max) {
            return;
        }

        parent.find("." + axis + "label").attr("need-remove", true);
        grid.pointNum = 0;
        var interval = calcInterval(min, max, interval);
        for (var i = 0; i < interval.length; i++) {
            var pos = (interval[i] - min) / (max - min);
            // 更新坐标刻度标签
            var t = parent.find("." + axis + "label[need-remove=true]");
            if (t.length > 0) {
                tt = t.filter("[value='" + interval[i] + "']").first();
                if (tt.length > 0) {
                    t = tt;
                    t.attr("need-remove", false);
                } else {
                    t = t.first();
                    t.attr("need-remove", false);
                    t.text(interval[i]);
                    t.attr("value", interval[i]);
                }
            } else {
                var t = $("<div class=\"" + axis + "label\"></div>");
                t.attr("need-remove", false);
                t.text(interval[i]);
                t.attr("value", interval[i]);
                t.css("position", "absolute")
                parent.append(t);
            }
            if (axis == 'x') {
                t.css("top", this.canvas.top + this.canvas.y + 'px');
                t.css("left", this.canvas.left + pos * this.canvas.x - t.width() / 2 + 'px');
            } else {
                t.css("top", this.canvas.top + (1 - pos) * this.canvas.y - t.height() / 2 + 'px');
                t.css("left", this.canvas.left - t.width() - 3 + 'px');
            }
            // 更新网格线
            var points = grid.geometry.attributes.position.array;
            points[grid.pointNum*3] = axis == "x" ? pos : 0;
            points[grid.pointNum*3+1] = axis == "x" ? 0 : pos;
            points[grid.pointNum*3+2] = -1;
            grid.pointNum++;
            points[grid.pointNum*3] = axis == "x" ? pos : 0;
            points[grid.pointNum*3+1] = axis == "x" ? 0 : pos;
            points[grid.pointNum*3+2] = 1;
            grid.pointNum++;
            points[grid.pointNum*3] = axis == "x" ? pos : 1;
            points[grid.pointNum*3+1] = axis == "x" ? 1 : pos;
            points[grid.pointNum*3+2] = 1;
            grid.pointNum++;
            points[grid.pointNum*3] = axis == "x" ? pos : 1;
            points[grid.pointNum*3+1] = axis == "x" ? 1 : pos;
            points[grid.pointNum*3+2] = -1;
            grid.pointNum++;
        }
        grid.min = min;
        grid.max = max;
        grid.geometry.setDrawRange(0, grid.pointNum);
        grid.geometry.attributes.position.needsUpdate = true;
        parent.find("." + axis + "label[need-remove=true]").css("visibility", "hidden");
        parent.find("." + axis + "label[need-remove=false]").css("visibility", "visible");
    }
    this.updateGrid = function() {
        if (Math.abs(this.canvas.top - this.domElement.position().top) > 1) {
            console.log("remap", this.canvas.top, this.domElement.position().top);
            this.canvas.top = this.domElement.position().top;
            this.drawGrid("x");
            this.drawGrid("y");
        } else {
            if (this.xmin != this.xGrid.min || this.xmax != this.xGrid.max) {
                this.drawGrid("x");
            }
            if (this.ymin != this.yGrid.min || this.ymax != this.yGrid.max) {
                this.drawGrid("y");
            }
        }
    }
    // 渲染函数
    this.render = function() {
        this.renderer.render(this.scene, this.camera);
    };
    // 初始化函数
    this.drawGrid("x");
    this.drawGrid("y");
    this.render();
};

var RealtimePlot1D = function(domElement, data, maxTime) {
    if (data == null) {
        throw("RealtimePlot1D(domElement, data, maxTime) must define data");
    }
    this.data = data;
    this.maxTime = maxTime == null ? 20 : maxTime;
    this.prevTime = 1;
    // 继承BasePlot2D
    BasePlot2D.apply(this, [domElement, -this.prevTime, this.maxTime]);
    // 初始化变量
    this.maxPoints = 150 * this.maxTime; // 每天曲线最多保持n个数据点
    this.minInterval = this.maxTime / this.maxPoints;
    this.dataIndex = [];    // 需要显示的数据列
    this.lines = [];        // 曲线THREE.Line数组
    this.datamin = null;
    this.datamax = null;
    this.time = -this.prevTime;
    // 设置需要绘制的变量
    this.addDataIndex = function(index, color) {
        if (this.dataIndex.indexOf(index) >= 0) return;
        if (color == null)  color = 0x000000;
        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.maxPoints * 3), 3));
        var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: new THREE.Color(color)}));
        line.pointNum = 0;
        line.geometry.setDrawRange(0, line.pointNum);
        this.scene.add(line);
        this.lines.push(line);
        this.dataIndex.push(index);
        this.update(true);
        this.renderer.render(this.scene, this.camera);
    }
    this.delDataIndex = function(index) {
        var i = this.dataIndex.indexOf(index);
        if (i < 0) throw("delDataIndex(index) index did not exist");
        this.scene.remove(this.lines[i]);
        deleteMesh(this.lines[i]);
        this.lines.splice(i, 1);
        this.dataIndex.splice(i, 1);
        this.renderer.render(this.scene, this.camera);
    }
    this.clearLine = function(index) {
        var i = this.dataIndex.indexOf(index);
        if (i < 0) throw("clearLine(index) index did not exist", index);
        var line = this.lines[i];
        line.pointNum = 0;
    }
    this.fillLine = function(index) {
        var i = this.dataIndex.indexOf(index);
        if (i < 0) throw("fillLine(index) index did not exist");
        var line = this.lines[i];
        var points = line.geometry.attributes.position.array;
        var time;
        if (line.pointNum > 0) {
            time = line.time;
        } else {
            time = this.xmin;
        }
        var data = this.data.findAfter(time)
        while (data != null) {
            if (line.pointNum >= this.maxPoints) {
                throw("points full " + line.pointNum);
            }
            points[line.pointNum*3] = (data.time - this.xmin) / (this.xmax - this.xmin);
            points[line.pointNum*3+1] = (data[index] - this.ymin) / (this.ymax - this.ymin);
            points[line.pointNum*3+2] = 2;
            line.pointNum++;
            time = data.time;
            data = this.data.findAfter(time + this.minInterval, data.index);
        }
        line.time = time;
        line.geometry.setDrawRange(0, line.pointNum);
        line.geometry.attributes.position.needsUpdate = true;
    }
    this.update = function(force) {
        if (this.data.time >= this.xmax || this.data.time < this.time || force) {
            // 重绘
            this.time = this.data.time;
            this.xmin = Math.floor(this.data.time / this.maxTime) * this.maxTime;
            this.xmax = this.xmin + this.maxTime;
            this.xmin -= this.prevTime;
            var minmax = this.data.statsRange(this.dataIndex, this.xmin, this.xmax);
            if (minmax[0] == null) {
                return;
            }
            this.datamax = minmax[1];
            this.datamin = minmax[0];
            this.ymin = minmax[0] - (minmax[1] - minmax[0]) * 0.2;
            this.ymax = minmax[1] + (minmax[1] - minmax[0]) * 0.2;
            if (this.ymax - this.ymin < 0.1) {
                this.ymax += 0.05;
                this.ymin -= 0.05;
            }
            this.drawGrid("x");
            this.drawGrid("y");
            for (i in this.dataIndex) {
                this.clearLine(this.dataIndex[i]);
                this.fillLine(this.dataIndex[i]);
            }
            return true;
        } else if (this.data.time >= this.time + this.minInterval) {
            // 有新数据点
            var minmax = this.data.statsRange(this.dataIndex, this.time, null);
            if (minmax[0] == null) {
                throw("updateRange() no data");
            }
            this.time = this.data.time;
            this.datamax = minmax[1] > this.datamax ? minmax[1] : this.datamax;
            this.datamin = minmax[0] < this.datamin ? minmax[0] : this.datamin;
            // 判断是否需要更新Y轴量程
            var needResize = false;
            if (minmax[0] < this.ymin && minmax[1] > this.ymax) {
                this.ymin = this.datamin - (this.datamax - this.datamin) * 0.3;
                this.ymax = this.datamax + (this.datamax - this.datamin) * 0.3;
                console.log("resize");
                needResize = true;
            } else if (minmax[0] < this.ymin && minmax[1] <= this.ymax) {
                this.ymin = this.datamin - (this.datamax - this.datamin) * 0.3;
                this.ymax = this.datamax + (this.datamax - this.datamin) * 0.2;
                needResize = true;
            } else if (minmax[0] >= this.ymin && minmax[1] > this.ymax) {
                this.ymin = this.datamin - (this.datamax - this.datamin) * 0.2;
                this.ymax = this.datamax + (this.datamax - this.datamin) * 0.3;
                needResize = true;
            }
            this.updateGrid();
            // 写入新数据
            for (i in this.dataIndex) {
                if (needResize) {
                    this.clearLine(this.dataIndex[i]);
                }
                this.fillLine(this.dataIndex[i]);
            }
            return true;
        }
        return false;
    }
    // 渲染
    this.render = function() {
        if (this.dataIndex.length && this.update()) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// 当两个点的像素间距大于minInterval时,才绘制新点
var RealtimePlot2D = function(domElement, data, interval, disableReGrid) {
    if (data == null) {
        throw("RealtimePlot2D(domElement, data, minInterval) must define data");
    }
    this.data = data;
    this.interval = interval == null ? 0.5 : interval;  // 默认两个点的最小像素间距为0.5
    this.disableReGrid = disableReGrid ? true : false;
    // 继承BasePlot2D, 默认绘制2x2的大小
    BasePlot2D.apply(this, [domElement, -1, 1, ]);
    // 保持横纵比为1:1
    this.ymin = -(this.xmax - this.xmin) / 2 * this.canvas.y / this.canvas.x;
    this.ymax = (this.xmax - this.xmin) / 2 * this.canvas.y / this.canvas.x;
    this.yInterval = this.xInterval * this.canvas.y / this.canvas.x;
    this.drawGrid("y");
    this.renderer.render(this.scene, this.camera);
    // 根据窗口大小计算minInterval
    this.minInterval = 0;
    this.updateInterval = function() {
        this.minInterval = (this.xmax - this.xmin) / this.canvas.x * this.interval;
    }
    this.updateInterval();
    // 初始化变量
    // 每条曲线最多保存的数据点数
    this.maxPoints = (this.canvas.x + this.canvas.y) * 20 / this.interval; 
    this.dataIndex = [];    // 需要显示的数据列
    this.lines = [];        // 曲线THREE.Line数组
    // 记录变量的最大值与最小值
    this.datamin = [null, null];
    this.datamax = [null, null];
    this.time = 0;  // 重绘计时

    // 查找对应序号, 不存在则返回null
    this.findIndex = function(index) {
        var i = 0;
        for (k in this.dataIndex) {
            var v = this.dataIndex[k];
            if (v.toString() == index.toString())
                return i;
            i++;
        }
        // 如果未找到
        return null;
    }

    // 添加曲线, index=[index_x, index_y]
    this.addDataIndex = function(index, color) {
        if (this.findIndex(index) != null) return;  // 曲线已经存在则跳过
        if (color == null)  color = 0x000000;   // 默认颜色
        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.maxPoints * 3), 3));
        var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: new THREE.Color(color), linewidth: 5}));
        line.pointNum = 0;
        line.geometry.setDrawRange(0, line.pointNum);
        this.scene.add(line);
        this.lines.push(line);
        this.dataIndex.push(index);
        this.update(true);
        this.renderer.render(this.scene, this.camera);
    }

    // 删除曲线
    this.delDataIndex = function(index) {
        var i = this.findIndex(index);
        if (i == null) throw("delDataIndex(index) index did not exist");
        this.scene.remove(this.lines[i]);
        deleteMesh(this.lines[i]);
        this.lines.splice(i, 1);
        this.dataIndex.splice(i, 1);
        this.renderer.render(this.scene, this.camera);
    }

    // 清除曲线的数据点
    this.clearLine = function(index) {
        var i = this.findIndex(index);
        if (i == null) throw("clearLine(index) index did not exist " + index);
        var line = this.lines[i];
        line.pointNum = 0;
    }

    // 自动根据数据源, 向曲线中添加数据点
    this.fillLine = function(index) {
        var i = this.findIndex(index);
        if (i == null) throw("fillLine(index) index did not exist");
        var line = this.lines[i];
        var points = line.geometry.attributes.position.array;
        var lastData, data;
        // 查找下一个点
        if (line.pointNum > 0) {
            lastData = line.lastData;
            data = this.data.get(lastData.index + 1);
        } else {
            lastData = null;
            data = this.data.get(0);
        }
        // 当查找到时
        while (data != null) {
            // 判断点间距
            var draw = true;
            if (lastData != null) {
                var dx = Math.abs(data[index[0]] - lastData[index[0]]);
                var dy = Math.abs(data[index[1]] - lastData[index[1]]);
                if (Math.sqrt(dx * dx + dy * dy) < this.minInterval) {
                    draw = false;
                }
            }
            if (draw) {
                if (line.pointNum >= this.maxPoints) {
                    throw("points full " + line.pointNum);
                }
                points[line.pointNum*3] = (data[index[0]] - this.xmin) / (this.xmax - this.xmin);
                points[line.pointNum*3+1] = (data[index[1]] - this.ymin) / (this.ymax - this.ymin);
                points[line.pointNum*3+2] = 2;
                line.pointNum++;
                //通知图层更新
                lastData = data;
            }
            data = this.data.get(data.index + 1);
        }
        line.lastData = lastData;
        line.geometry.setDrawRange(0, line.pointNum);
        line.geometry.attributes.position.needsUpdate = true;
    }
    this.update = function(force) {
        // 如果数据时间戳小于图表时间戳, 说明远端发生了复位
        if (this.data.time < this.time || force) {
            // 重绘
            // 有新数据点
            this.time = this.data.time;
            if (!this.disableReGrid) { // 判断是否禁止坐标轴更新
                // 分离x,y轴索引
                var x_indexes = [];
                var y_indexes = [];
                for (k in this.dataIndex) {
                    var v = this.dataIndex[k];
                    x_indexes.push(v[0]);
                    y_indexes.push(v[1]);
                }
                // 统计数据最大最小值
                var minmax_x = this.data.statsRange(x_indexes, -1, null);
                var minmax_y = this.data.statsRange(y_indexes, -1, null);
                if (minmax_x[0] == null || minmax_y[0] == null) {
                    return false;
                }
                this.datamax = [minmax_x[1], minmax_y[1]];
                this.datamin = [minmax_x[0], minmax_y[0]];
                // 设置绘图范围
                this.xmin = minmax_x[0] - (minmax_x[1] - minmax_x[0]) * 0.1;
                this.xmax = minmax_x[1] + (minmax_x[1] - minmax_x[0]) * 0.1;
                this.ymin = minmax_y[0] - (minmax_y[1] - minmax_y[0]) * 0.1;
                this.ymax = minmax_y[1] + (minmax_y[1] - minmax_y[0]) * 0.1;
                if (this.xmax - this.xmin < 0.1) {
                    this.xmax += 0.05;
                    this.xmin -= 0.05;
                }
                if (this.ymax - this.ymin < 0.1) {
                    this.ymax += 0.05;
                    this.ymin -= 0.05;
                }
                this.updateInterval();
                this.updateGrid();
            }
            for (i in this.dataIndex) {
                this.clearLine(this.dataIndex[i]);
                this.fillLine(this.dataIndex[i]);
            }
            // 更新目标旋转值和位置
            if (this.meshTarget) {
                this.meshTarget.updateTarget();
            }
            return true;
        } else if (this.data.time > this.time) {
            // 有新数据点
            this.time = this.data.time;
            if (!this.disableReGrid) { // 判断是否禁止坐标轴更新
                // 分离x,y轴索引
                var x_indexes = [];
                var y_indexes = [];
                for (k in this.dataIndex) {
                    var v = this.dataIndex[k];
                    x_indexes.push(v[0]);
                    y_indexes.push(v[1]);
                }
                // 统计数据最大最小值
                var minmax_x = this.data.statsRange(x_indexes, -1, null);
                var minmax_y = this.data.statsRange(y_indexes, -1, null);
                if (minmax_x[0] == null || minmax_y[0] == null) {
                    return false;
                }
                this.datamax[0] = minmax_x[1] > this.datamax[0] || this.datamax[0] == null ? minmax_x[1] : this.datamax[0];
                this.datamax[1] = minmax_y[1] > this.datamax[1] || this.datamax[1] == null ? minmax_y[1] : this.datamax[1];
                this.datamin[0] = minmax_x[0] < this.datamin[0] || this.datamin[0] == null ? minmax_x[0] : this.datamin[0];
                this.datamin[1] = minmax_y[0] < this.datamin[1] || this.datamin[1] == null ? minmax_y[0] : this.datamin[1];
                // 判断是否需要更新绘图范围
                var needResize = false;
                if (minmax_x[0] < this.xmin && minmax_x[1] > this.xmax) {
                    this.xmin = this.datamin[0] - (this.datamax[0] - this.datamin[0]) * 0.1;
                    this.xmax = this.datamax[0] + (this.datamax[0] - this.datamin[0]) * 0.1;
                    needResize = true;
                } else if (minmax_x[0] < this.xmin && minmax_x[1] <= this.xmax) {
                    this.xmin = this.datamin[0] - (this.datamax[0] - this.datamin[0]) * 0.1;
                    this.xmax = this.datamax[0] + (this.datamax[0] - this.datamin[0]) * 0.1;
                    needResize = true;
                } else if (minmax_x[0] >= this.xmin && minmax_x[1] > this.xmax) {
                    this.xmin = this.datamin[0] - (this.datamax[0] - this.datamin[0]) * 0.1;
                    this.xmax = this.datamax[0] + (this.datamax[0] - this.datamin[0]) * 0.1;
                    needResize = true;
                }
                if (minmax_y[0] < this.ymin && minmax_y[1] > this.ymax) {
                    this.ymin = this.datamin[1] - (this.datamax[1] - this.datamin[1]) * 0.1;
                    this.ymax = this.datamax[1] + (this.datamax[1] - this.datamin[1]) * 0.1;
                    needResize = true;
                } else if (minmax_y[0] < this.ymin && minmax_y[1] <= this.ymax) {
                    this.ymin = this.datamin[1] - (this.datamax[1] - this.datamin[1]) * 0.1;
                    this.ymax = this.datamax[1] + (this.datamax[1] - this.datamin[1]) * 0.1;
                    needResize = true;
                } else if (minmax_y[0] >= this.ymin && minmax_y[1] > this.ymax) {
                    this.ymin = this.datamin[1] - (this.datamax[1] - this.datamin[1]) * 0.1;
                    this.ymax = this.datamax[1] + (this.datamax[1] - this.datamin[1]) * 0.1;
                    needResize = true;
                }
                if (needResize) {
                    // 保持横纵比
                    if ((this.ymax - this.ymin) / this.canvas.y < (this.xmax - this.xmin) / this.canvas.x) {
                        // 以x轴为基准
                        var center = (this.ymin + this.ymax) / 2;
                        this.ymin = center - (this.xmax - this.xmin) / 2 * this.canvas.y / this.canvas.x;
                        this.ymax = center + (this.xmax - this.xmin) / 2 * this.canvas.y / this.canvas.x;
                    } else {
                        // 以y轴为基准
                        var center = (this.xmin + this.xmax) / 2;
                        this.xmin = center - (this.ymax - this.ymin) / 2 * this.canvas.x / this.canvas.y;
                        this.xmax = center + (this.ymax - this.ymin) / 2 * this.canvas.x / this.canvas.y;
                    }
                    // 绘制新坐标轴
                    this.updateInterval();
                }
                this.updateGrid();
            }
            // 写入新数据
            for (i in this.dataIndex) {
                if (needResize) {
                    this.clearLine(this.dataIndex[i]);
                }
                this.fillLine(this.dataIndex[i]);
            }
            // 更新目标旋转值和位置
            if (this.meshTarget) {
                this.meshTarget.updateTarget();
            }
            return true;
        }
        this.updateGrid();
        return false;
    }
    // 设置画布背景
    // 参数: 图片url, 图宽度, 图高度, 图中心x位置, 图中心y位置
    this.setBackround = function(pic_path, width, height, x, y) {
        var parent = this;
        new THREE.TextureLoader().load(pic_path, function(texture) {
            var geometry = new THREE.PlaneGeometry(width / (parent.xmax-parent.xmin), height/(parent.ymax-parent.ymin));
            var material = new THREE.MeshBasicMaterial({map:texture});
            parent.meshBackGround = new THREE.Mesh(geometry,material);
            parent.meshBackGround.position.set((x - parent.xmin)/(parent.xmax-parent.xmin), (y - parent.ymin)/(parent.ymax-parent.ymin), 1);
            parent.scene.add(parent.meshBackGround);
            parent.render(true);    // 强制重绘
        });
    }
    // 设置目标图片
    // 参数: 图片url, 图宽度, 图高度, X坐标对应的数据列, Y坐标对应的数据列, 目标的指向角度(航向角对应的数据列)
    this.setTarget = function(pic_path, width, height, indexX, indexY, indexR) {
        var parent = this;
        new THREE.TextureLoader().load(pic_path, function(texture) {
            var geometry = new THREE.PlaneGeometry(width / (parent.xmax-parent.xmin), height/(parent.ymax-parent.ymin));
            var material = new THREE.MeshBasicMaterial({map:texture});
            material.transparent = true;    // 设置图片透明度
            parent.meshTarget = new THREE.Mesh(geometry,material);
            parent.meshTarget.position.set((0 - parent.xmin)/(parent.xmax-parent.xmin), (0 - parent.ymin)/(parent.ymax-parent.ymin), 1);
            parent.meshTarget.rotation.z = 0;
            parent.meshTarget.updateTarget = function() {
                var lastData = parent.data.get(-1);
                parent.meshTarget.rotation.z = lastData[indexR] / 180 * Math.PI;
                parent.meshTarget.position.x = (lastData[indexX] - parent.xmin)/(parent.xmax-parent.xmin);
                parent.meshTarget.position.y = (lastData[indexY] - parent.ymin)/(parent.ymax-parent.ymin);
            }
            parent.scene.add(parent.meshTarget);
            parent.render(true);    // 强制重绘
        });
    }
    // 渲染
    this.render = function(force) {
        if (force || (this.dataIndex.length && this.update())) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}