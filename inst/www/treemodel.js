$.extend($.fn.treegrid.methods, {
	editCell: function(jq,param){
		return jq.each(function(){
			var fields = $(this).treegrid('getColumnFields',true).concat($(this).treegrid('getColumnFields'));
			for(var i=0; i<fields.length; i++){
				var col = $(this).treegrid('getColumnOption', fields[i]);
				col.editor1 = col.editor;
				if (fields[i] != param.field){
					col.editor = null;
				}
			}
			$(this).treegrid('beginEdit', param.index);
			for(var i=0; i<fields.length; i++){
				var col = $(this).treegrid('getColumnOption', fields[i]);
				col.editor = col.editor1;
			}
		});
	}
});

promptEquation = function(model,row,field){
	if(field=="name") return false; //TODO: allow editing variable name
	var data=model.get('equations').map(function(arr){return arr.slice();});
	var names=data.map(function(x){return x[0]});
	var index=names.indexOf(row.name);
	var scens=model.get("scens");
	var col=parseInt(field.replace("scen",""))-1
	if(index==-1){
		//add a new variable
		index=data.push([row.name])-1; 
		//all scenarios need to be present
		// for ocpu to send a matrix not a list
		for(i=0;i<model.get("header").length;i++){
			if(!data[index][i]) data[index][i]="";
		}
	}
	var equation=data[index][scens[col]]
	var header=model.get("header");
	var newequation=prompt("Equation/value for '"+row.name+"' ("+header[scens[col]]+")",equation);
    if(newequation) {
		data[index][scens[col]]=newequation;
		//console.log(data);
		model.set('equations',data);
	}
}

//http://www.jeasyui.com/forum/index.php?topic=2307.0
//TODO: resizable
promptEquation_messager = function(model,row,field){
	if(field=="name") return false; //TODO: allow editing variable name
	var data=model.get('equations').map(function(arr){return arr.slice();});
	var names=data.map(function(x){return x[0]});
	var index=names.indexOf(row.name);
	var scens=model.get("scens");
	var col=parseInt(field.replace("scen",""))-1
	var equation=data[index][scens[col]]
	var header=model.get("header");
	$.messager.prompt('Edit '+header[scens[col]], "Equation/value for '"+row.name+"'", function(newequation) {
		if(newequation) {
			data[index][scens[col]]=newequation;
			console.log(data);
			model.set('equations',data);
		}
	});
    $('.messager-input').val(equation).focus();
}

var TreeView = Backbone.View.extend({
	//model is an Analysis
	initialize: function(){
		this.listenTo(this.model,'change:equations', this.render, this);
		this.listenTo(this.model,'change:showEquation', this.render, this);
		this.listenTo(this.model,'change:scens', this.setup, this);
		this.listenTo(this.model,'change:header', this.setup, this);
		this.model.set('expanded',{});
		this.setup();
	},
	render: function(){
		this.$el.treegrid('reload');
	},
	setup: function() {    
		var model = this.model;
		this.$el.treegrid({
			loader:function(param,success,error){
				var req=ocpu.rpc('getChildren',param,function(data){
					//TODO: these shouldn't be arrays from ocpu
					f=function(x){
						_.each(x,function(e,i){
							_.each(e,function(d,j){
								if(j=="children"){
									f(e[j]);
								} else {e[j]=d[0]}
							});
						});				
					}
					f(data);
					success(data)
				});
				req.fail(error);
			},
			method:'get',
			rownumbers: false,
			idField: 'id',
			treeField: 'name',
			columns:[[
				{field:'name',title:model.get('header')[0],width:220,editor:'text'},
				{field:'scen1',title:model.get('header')[model.get('scens')[0]],width:300,
					editor:'text',formatter:formatVector,align:'right'},
				{field:'scen2',title:model.get('header')[model.get('scens')[1]],width:300,
					editor:'text',formatter:formatVector,align:'right'}
			]],		
			onBeforeLoad: function(row,param){
				if (!row) {	// load top level rows
					param.id = 0;	// set id=0, indicate to load new page rows
				} else {
					param.name=row.name;
				}
				param.equations=model.selectEqns(model.get('scens'));
				param.showEquation=model.get("showEquation");
				param.open=Object.keys(model.get("expanded"));
			},
			onExpand:function(row){
				model.get("expanded")[row.id]=true;
			},
			onCollapse:function(row){
				delete model.get("expanded")[row.id]
			},
			onDblClickCell: function(field,row){
				if(!model.get('showEquation')) {
					promptEquation(model,row,field);
					return false;
				}
				var dg=$(this);
				var index=row.id;
				dg.treegrid('editCell', {index:index,field:field});
				var ed = dg.treegrid('getEditor', {id:index,field:field});
				$(ed.target).focus();
				$(ed.target).on('blur',function(e){
					e.stopPropagation();
					dg.treegrid('endEdit', index);
				}).on('keydown',function(e){
					if(e.keyCode==13){dg.treegrid('endEdit', index);return false;}
				}).on('keydown',function(e){
					if(e.keyCode==27){dg.treegrid('cancelEdit', index);return false;}
				});
			},
			onAfterEdit: function(rowData,changes){
									console.log('TreeView onAfterEdit');
									var name=rowData.name;
									var data=model.get('equations').map(function(arr){return arr.slice();});
									var names=data.map(function(x){return x[0]});
									var index=names.indexOf(name);
									var scens=model.get("scens");
									if(index==-1){
										//add a new variable
										index=data.push([name])-1; 
										//all scenarios need to be present
										// for ocpu to send a matrix not a list
										for(i=0;i<model.get("header").length;i++){
											if(!data[index][i]) data[index][i]="";
										}
									}
									if(changes.scen1) data[index][scens[0]]=changes.scen1;
									if(changes.scen2) data[index][scens[1]]=changes.scen2;
									//TODO: allow renaming throughout the matrix	
									if(changes.Variable) data[index][0]=changes.Variable;
									console.log(data);
									model.set('equations',data);
                                },
			checkOnSelect:false,
			selectOnCheck:false
		});
		return this;
	}
});


function formatVector(value){
	if (value){
		return(JSON.stringify(value).replace(/"/g,''));
	} else {
		return '';
	}
}