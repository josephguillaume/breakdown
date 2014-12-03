
$.extend($.fn.datagrid.methods, {
	editCell: function(jq,param){
		return jq.each(function(){
			var opts = $(this).datagrid('options');
			var fields = $(this).datagrid('getColumnFields',true).concat($(this).datagrid('getColumnFields'));
			for(var i=0; i<fields.length; i++){
				var col = $(this).datagrid('getColumnOption', fields[i]);
				col.editor1 = col.editor;
				if (fields[i] != param.field){
					col.editor = null;
				}
			}
			$(this).datagrid('beginEdit', param.index);
			for(var i=0; i<fields.length; i++){
				var col = $(this).datagrid('getColumnOption', fields[i]);
				col.editor = col.editor1;
			}
		});
	}
});

function deleterow(dg,model,dgname){
	console.log('deleterow')
	var selected=dg.datagrid('getSelected');
	if(selected==null) return(null)
	$.messager.confirm('Confirm','Are you sure?',function(r){
		if (r){
			//dg.datagrid('deleteRow',dg.getRowIndex(selected)); //whole datagrid will be reset anyway
			model.delVar(selected.Variable,dgname);
		}
	});
}

function addrow(dg){
	var obj={};
	for(n in dg.datagrid('getColumnFields')) obj[n]='';
	dg.datagrid("appendRow",obj);
}

var DGEquations = Backbone.View.extend({
    initialize: function(){
        this.model.on('change:equations', this.render, this);
		this.model.on('change:scens', this.render, this);
		this.model.on('change:header', this.render, this);
		this.model.on('change:selected_var1',this.setSelected,this)
        this.render();
    }, 
	setSelected:function(){
		var selected=this.model.get('selected_var1');
		//console.log("setSelected on equations "+selected);
		if(selected) this.$el.datagrid('selectRecord',selected);
	},
    render: function() {
		var model=this.model;
		var scens=model.get("scens");
		var data=model.get("equations");
		data=data.map(function(x){return({Variable:x[0],scen1:x[scens[0]],scen2:x[scens[1]]});});
		this.$el.datagrid({
			data: data,
			idField:'Variable',
			columns:[[
			//TODO: sortable:true
			{field:'Variable',title:model.get('header')[0],width:220,editor:'text'},
			{field:'scen1',title:model.get('header')[scens[0]],width:300,editor:'text'},
			{field:'scen2',title:model.get('header')[scens[1]],width:300,editor:'text'}
			]],
			singleSelect:true,
			fit:true,
			onSelect: function(index,rowData){
				//console.log("equations selected "+rowData.Variable);
				model.set("selected_var1",rowData.Variable);
			},
			onDblClickCell: function(index,field,value){
				var dg=$(this);
				dg.datagrid('editCell', {index:index,field:field});
				var ed = dg.datagrid('getEditor', {index:index,field:field});
				$(ed.target).focus();
				$(ed.target).on('blur',function(e){
					e.stopPropagation();
					dg.datagrid('endEdit', index);
				}).on('keydown',function(e){
					if(e.keyCode==13){dg.datagrid('endEdit', index);return false;}
				}).on('keydown',function(e){
					if(e.keyCode==27){dg.datagrid('cancelEdit', index);return false;}
				});
			},
			onAfterEdit: function(index,rowData,changes){
									console.log('DGEquations onAfterEdit');
									var data=model.get('equations').map(function(arr){return arr.slice();});
									if(index >= data.length) data[index]=[]; //add a new variable
									//all columns need to be present
									// for ocpu to send a matrix not a list
									for(i=0;i<model.get("header").length;i++){
										if(!data[index][i]) data[index][i]="";
									}
									if(changes.scen1) data[index][scens[0]]=changes.scen1;
									if(changes.scen2) data[index][scens[1]]=changes.scen2;
									//TODO: allow renaming throughout the matrix	
									if(changes.Variable) data[index][0]=changes.Variable;
									model.set('equations',data);
                                },
			checkOnSelect:false,
			selectOnCheck:false
		});
		this.$el.closest(".datagrid-view").find(".datagrid-header-row td").on('dblclick',function(){
			var field=$(this).attr('field');
			if(field=="Variable") idx=0
			if(field=="scen1") idx=model.get('scens')[0]
			if(field=="scen2") idx=model.get('scens')[1]
			var header=model.get('header').slice();
			var oldname=header[idx];
			var newname=prompt("Rename '"+oldname+"' to:",oldname);
			if(newname) {
				header[idx]=newname;
				model.set('header',header);
			}
		});
        return this;
   }

});

var DGRanges = Backbone.View.extend({
    initialize: function(){
        this.model.on('change:ranges', this.render, this);
		this.model.on('change:equations', this.render, this);
		this.model.on('change:selected_var1',this.setSelected,this)
        this.render();
    }, 
	setSelected:function(){
		var selected=this.model.get('selected_var1');
		//console.log("setSelected on ranges "+selected);
		if(selected) this.$el.datagrid('selectRecord',selected);
	},
    render: function() {
		var model=this.model;
		var scens=model.get("scens");
		var data=model.get("ranges");
		//TODO: show calculated modeled value as default Best
		data=data.map(function(x){return({Variable:x[0],Lower:x[1],Min:x[2],Best:x[3],Max:x[4],Upper:x[5]});});
		
		var noEnterHandler= $.extend({},$.fn.combobox.defaults.keyHandler,{enter:function(q){return true;}});
		
		this.$el.datagrid({
			data: data,
			idField:'Variable',
			columns:[[
			//TODO: sortable:true
			{field:'Variable',title:model.get('header')[0],width:220,
				editor:{
					type:'combobox',
					options:{
						valueField:'value',
						textField:'value',
						//TODO: only allow the variable if it has the same value in each column?
						data:model.get("equations").map(function(x){return({value:x[0]})}),
						keyHandler:noEnterHandler
					}
				}
			},
			{field:'Lower',title:"Analysis min",width:100,editor:'text'},
			{field:'Min',title:"Min",width:100,editor:'text'},
			{field:'Best',title:"Best guess",width:100,editor:'text'},
			{field:'Max',title:"Max",width:100,editor:'text'},
			{field:'Upper',title:"Analysis max",width:100,editor:'text'}
			]],
			singleSelect:true,
			fit:true,
			onSelect: function(index,rowData){
				//console.log("range selected "+rowData.Variable);
				model.set("selected_var1",rowData.Variable);
			},
			onDblClickCell: function(index,field,value){
				var dg=$(this);
				dg.datagrid('editCell', {index:index,field:field});
				var ed = dg.datagrid('getEditor', {index:index,field:field});
				if(ed.type=="combobox"){
					//cursor is in input that is siblings child, not in target directly
					$(ed.target).next().children("input").focus();
					$(document).on('keydown',function(e){
						if(e.keyCode==13){dg.datagrid('endEdit', index);$(document).off('keydown');return false;}
						if(e.keyCode==9){dg.datagrid('endEdit', index);$(document).off('keydown');return false;}
						if(e.keyCode==27){dg.datagrid('cancelEdit', index);$(document).off('keydown');return false;}
					});
				} else {
					$(ed.target).focus();
					$(ed.target).on('blur',function(e){
						e.stopPropagation();
						dg.datagrid('endEdit', index);
					}).on('keydown',function(e){
						if(e.keyCode==13){dg.datagrid('endEdit', index);return false;}
						if(e.keyCode==9){dg.datagrid('endEdit', index);$(document).off('keydown');return false;}
						if(e.keyCode==27){dg.datagrid('cancelEdit', index);return false;}
					});
				}
			},
			onAfterEdit: function(index,rowData,changes){
				console.log('DGRanges onAfterEdit');
				var dg = $(this);
				var data=model.get('ranges').map(function(arr){return arr.slice();});
				if(index >= data.length) data[index]=[]; //add a new variable
				//TODO: evaluate the new variable's modeled value
				$.each(changes, function(key, value) {
					data[index][dg.datagrid('getColumnFields').indexOf(key)]=value;
				});
				model.set('ranges',data);
			},
			checkOnSelect:false,
			selectOnCheck:false
		});
        return this;
   }

});
