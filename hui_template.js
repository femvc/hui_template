'use strict';
//   __  __   __  __    _____   ______   ______   __  __   _____     
//  /\ \/\ \ /\ \/\ \  /\___ \ /\__  _\ /\  _  \ /\ \/\ \ /\  __`\   
//  \ \ \_\ \\ \ \ \ \ \/__/\ \\/_/\ \/ \ \ \/\ \\ \ `\\ \\ \ \ \_\  
//   \ \  _  \\ \ \ \ \   _\ \ \  \ \ \  \ \  __ \\ \ . ` \\ \ \ =__ 
//    \ \ \ \ \\ \ \_\ \ /\ \_\ \  \_\ \__\ \ \/\ \\ \ \`\ \\ \ \_\ \
//     \ \_\ \_\\ \_____\\ \____/  /\_____\\ \_\ \_\\ \_\ \_\\ \____/
//      \/_/\/_/ \/_____/ \/___/   \/_____/ \/_/\/_/ \/_/\/_/ \/___/ 
//                                                                   
//                                                                   

var hui = typeof hui == 'undefined' ? {} : hui;

/**
 * @name 模板管理及解析类
 * @public
 * @author wanghaiyang
 * @date 2013/08/08
 */
hui.Template = {
    /**
     * @name 解析前 originTargetContainer, 解析后 targetContainer
     */
    originTargetContainer:{},
    targetContainer:{},
    targetRule : /<!--\s*target:\s*([a-zA-Z0-9\.\-_]+)\s*-->/g,
    importRule : /<!--\s*import:\s*([a-zA-Z0-9\.\-_]+)\s*-->/g,
    /**
     * @name 根据模板url列表载入相应HTML模板文件
     * @public
     * @param {String} tplList 模板文件URL列表
     */
    loadAllTemplate: function(){
        var me = this, 
            i, len,
            tplList = me.TEMPLATE_LIST || [];
        
        hui.Template.loadedCount = 0;
        for (i=0,len=tplList.length; i<len; i++){
            if(tplList[i]){
                hui.Template.loadedCount++;
                hui.Template.loadTemplate(tplList[i]);
            }
        }
        if (!tplList.length && typeof console !== 'undefined' && console.log) {
            console.log('[Warn] tpl list is blank.');
        }
        // 没有用到模板
        if (!hui.Template.loadedCount) {
            hui.Template.onload();
        }
    },
    /**
     * @name 根据url载入相应HTML模板文件
     * @public
     * @param {String} url 模板文件URL
     */
    loadTemplate: function(url){
        if (typeof Requester != 'undefined' && Requester && Requester.get) {
            Requester.get(url, {onsuccess: hui.Template.callback, on404: hui.Template.callback});
        }
        else if (typeof fs != 'undefined' && fs && fs.readFile) {
                fs.readFile(url, hui.Template.callback);
        }
    },
    /**
     * @name 模板加载回调事件接口
     * @private
     * @param {String} text 模板字符串
     */
    callback: function(err, text){
        hui.Template.loadedCount--;
        
        hui.Template.parseTemplate(text);
        if(hui.Template.loadedCount < 1){
            hui.Template.onload();
        }
    },
    /**
     * @name 模板加载完毕外部事件接口
     * @public
     */
    onload: function(callback){callback&&callback();},
    /**
     * @name 解析模板字符串流[增加target]
     * @public
     * @param {String} tplStr 模板字符串流tpl:<!-- target:mergeTest -->hello ${myName}!
     * @param {Object|string...} opts 提供相应数据的对象或多个字符串
     * @returns {String} 格式化后的字符串
     */
    parseTemplate:function(tplStr, lazyParse){
        var me = this,
            i,
            len,
            k,
            targetNameList,
            targetContentList,
            targetList,
            sep;
        
        //基本思路: 使用正则提取targetName与targetContent分别放入两个数组
        tplStr = !tplStr ? '' : String(tplStr);
        
        //坑爹的String.split(RegExp)有兼容性问题!!!
        //找到一个不重复的字符串做分隔符
        sep = String(Math.random()).replace('.','');
        for( i=0; tplStr.indexOf(sep)>-1 && i<1000; i++){sep = String(Math.random()).replace('.','');}
        if (tplStr.indexOf(sep)>-1) { throw { title: 'HUI Template Error: ',name: 'Math.random()'} }
        
        targetList = {};
        targetNameList = tplStr.match(me.targetRule)||[],
        targetContentList = tplStr.replace(me.targetRule, sep).split(sep);
        
        //抛弃掉第一个<!-- target: XXX -->之前的内容
        if (targetContentList.length-targetNameList.length==1) { targetContentList.shift(); }
        if (targetContentList.length != targetNameList.length) { throw { title: 'HUI Template Error: ', name: 'Methond "parseTemplate()" error.'} }
        
        for (i=0,len=targetNameList.length;i<len;i++){
            k = targetNameList[i].replace(me.targetRule,'$1');
            targetList[k] = targetContentList[i];
            
            //存入全局target容器(targetContainer中的后面将会替换)
            me.originTargetContainer[k] = targetContentList[i];
        }
        
        if (lazyParse !== true) {
            me.parseAllTarget();
        }
        
        return targetList;
    },
    /**
     * @name 获取Target
     * @public
     * @param {String} targetName Target名字
     * @returns {String} 未解析的target
     */
    getTarget: function(targetName){
        var me = this;
        if(targetName == null || targetName == '') return '';
        
        if(me.targetContainer[targetName] === undefined) {
            throw new Error('Target "'+targetName+'" not exist.');
        }
        
        return me.targetContainer[targetName];
    },
    /**
     * @name 依赖于me.originTargetContainer循环解析targetList中的target
     * @public
     * @param {String} tplStr 模板字符串流tpl:<!-- target:mergeTest -->hello ${myName}!
     * @param {Object|String...} opts 提供相应数据的对象或多个字符串
     * @returns {String} 格式化后的字符串
     */
    parseAllTarget: function(){
        var me = this,
            parsedTargetList = {},
            completeTargetName,
            parseTargetFinish = false,
            listSize,
            targetList;
        /**
         * 解析所有target
         */
        targetList = {};
        for(var i in me.originTargetContainer){
            if (!i || !me.originTargetContainer[i]) continue;
            targetList[i] = me.originTargetContainer[i]; 
        }
        
        for (var i in me.originTargetContainer) {
            if (!i || !me.originTargetContainer[i]) continue;
            var v = me.originTargetContainer[i];
            for (var j in targetList){
                if (!j || !targetList[j] || i == j) continue;
                targetList[j] = targetList[j].replace(new RegExp("<!--\\\s*import\\\s*:\\\s*("+i+")\\\s*-->", "g"), v);
            }
        }
        
        me.targetContainer = targetList;
        
        return targetList;
    },
    
    error: function(msg){
        msg = 'Template: ' + msg;
        if (typeof console !== 'undefined') {
            console.error(msg);
        }
        else throw Error(msg);
    }
};

exports.Template   = hui.Template;

