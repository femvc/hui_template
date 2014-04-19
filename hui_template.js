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
 * @name ģ�����������
 * @public
 * @author wanghaiyang
 * @date 2013/08/08
 */
hui.Template = {
    /**
     * @name ����ǰ originTargetContainer, ������ targetContainer
     */
    originTargetContainer:{},
    targetContainer:{},
    targetRule : /<!--\s*target:\s*([a-zA-Z0-9\.\-_]+)\s*-->/g,
    importRule : /<!--\s*import:\s*([a-zA-Z0-9\.\-_]+)\s*-->/g,
    /**
     * @name ����ģ��url�б�������ӦHTMLģ���ļ�
     * @public
     * @param {String} tplList ģ���ļ�URL�б�
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
        // û���õ�ģ��
        if (!hui.Template.loadedCount) {
            hui.Template.onload();
        }
    },
    /**
     * @name ����url������ӦHTMLģ���ļ�
     * @public
     * @param {String} url ģ���ļ�URL
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
     * @name ģ����ػص��¼��ӿ�
     * @private
     * @param {String} text ģ���ַ���
     */
    callback: function(err, text){
        hui.Template.loadedCount--;
        
        hui.Template.parseTemplate(text);
        if(hui.Template.loadedCount < 1){
            hui.Template.onload();
        }
    },
    /**
     * @name ģ���������ⲿ�¼��ӿ�
     * @public
     */
    onload: function(callback){callback&&callback();},
    /**
     * @name ����ģ���ַ�����[����target]
     * @public
     * @param {String} tplStr ģ���ַ�����tpl:<!-- target:mergeTest -->hello ${myName}!
     * @param {Object|string...} opts �ṩ��Ӧ���ݵĶ�������ַ���
     * @returns {String} ��ʽ������ַ���
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
        
        //����˼·: ʹ��������ȡtargetName��targetContent�ֱ������������
        tplStr = !tplStr ? '' : String(tplStr);
        
        //�ӵ���String.split(RegExp)�м���������!!!
        //�ҵ�һ�����ظ����ַ������ָ���
        sep = String(Math.random()).replace('.','');
        for( i=0; tplStr.indexOf(sep)>-1 && i<1000; i++){sep = String(Math.random()).replace('.','');}
        if (tplStr.indexOf(sep)>-1) { throw { title: 'HUI Template Error: ',name: 'Math.random()'} }
        
        targetList = {};
        targetNameList = tplStr.match(me.targetRule)||[],
        targetContentList = tplStr.replace(me.targetRule, sep).split(sep);
        
        //��������һ��<!-- target: XXX -->֮ǰ������
        if (targetContentList.length-targetNameList.length==1) { targetContentList.shift(); }
        if (targetContentList.length != targetNameList.length) { throw { title: 'HUI Template Error: ', name: 'Methond "parseTemplate()" error.'} }
        
        for (i=0,len=targetNameList.length;i<len;i++){
            k = targetNameList[i].replace(me.targetRule,'$1');
            targetList[k] = targetContentList[i];
            
            //����ȫ��target����(targetContainer�еĺ��潫���滻)
            me.originTargetContainer[k] = targetContentList[i];
        }
        
        if (lazyParse !== true) {
            me.parseAllTarget();
        }
        
        return targetList;
    },
    /**
     * @name ��ȡTarget
     * @public
     * @param {String} targetName Target����
     * @returns {String} δ������target
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
     * @name ������me.originTargetContainerѭ������targetList�е�target
     * @public
     * @param {String} tplStr ģ���ַ�����tpl:<!-- target:mergeTest -->hello ${myName}!
     * @param {Object|String...} opts �ṩ��Ӧ���ݵĶ�������ַ���
     * @returns {String} ��ʽ������ַ���
     */
    parseAllTarget: function(){
        var me = this,
            parsedTargetList = {},
            completeTargetName,
            parseTargetFinish = false,
            listSize,
            targetList;
        /**
         * ��������target
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

