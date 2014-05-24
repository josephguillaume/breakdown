
// http://mounirmesselmeni.github.io/2012/11/20/javascript-csv/
readCsv = function(files,handler){
   if (window.FileReader) {
		var reader = new FileReader();
		reader.readAsText(files[0]);
		reader.onload = function(event){
			//http://code.google.com/p/jquery-csv/downloads/list
			var result = $.csv.toArrays(event.target.result);
			//console.log(result);
			handler(result);
		};
		reader.onerror = function(event){
		    if(evt.target.error.name == "NotReadableError") {
				alert("Cannot read file !");
			}
		};
    } else {
        alert('FileReader are not supported in this browser.');
    }
}

var Analysis = Backbone.Model.extend({
	defaults: {
		equations: [],
		header:[],
		ranges:[],
		scens:[1,2],
		selected_var1: null
	},
	EquationsfromCSV:function(csv){
		console.log("EquationsfromCSV");
		this.set('header',csv[0])
		csv.splice(0,1); //remove header
		this.set('equations',csv);
		return this;
	},
	delVar:function(variable,dgname){
		console.log('delVar '+variable+' in '+dgname);
		if(variable==undefined) return(this);
		var vals=this.get(dgname).slice(0); //clone, because otherwise this bypasses set
		var i=vals.map(function(x){return(x[0])}).indexOf(variable);
		vals.splice(i,1);
		this.set(dgname,vals);
		if(variable==this.selected_var1) this.set("selected_var1",null);
		return this;
	},
	selectEqns:function(indices){
		var eqns=this.get('equations').map(function(x){
			// For each row
			return($.grep(x,function(e,i){
				// Return name and elements with desired indices
				return(i==0 || $.inArray(i,indices)>-1);
			}))
		});
		return(eqns);
	},
	getRanges:function(vars){
		if(!vars) return(null);
		if(!$.isArray(vars)) var vars=[vars];
		var ranges=this.get('ranges').slice(0);
		ranges=$.grep(ranges,function(e,i){
				// Return appropriate elements
				return($.inArray(e[0],vars)>-1);
			})
		return(ranges);
	},
	evaluate:function(column,variable){
		if(this.get('equations').length==0) return(this)
		dict={};
		for(i=0;i<this.get('equations').length;i++){
			dict[this.get('equations')[i][0]]=this.get('equations')[i][column]
		}
		var model=this;
		var req=ocpu.rpc("evaluate",{expr:variable,equations:dict},function(data){ 
			console.log('evaluate is setting '+variable+' for column '+column);
			var vals=model.get(variable).slice(0); //clone, because otherwise this bypasses set
			if(vals==undefined) vals=[];
			vals[column]=data[0]; //assuming its a scalar
			model.set(variable,vals);
		})
		req.fail(function(){
			$.messager.show({
					title:'Error',
					msg:req.responseText,
					timeout:5000,
					showType:'slide'
					});
			var vals=model.get(variable).slice(0);
			if(vals==undefined) vals=[];
			vals[column]=NaN;
			model.set(variable,vals);
		});
		return this;
	}
	//univariate
	//univariate plots
	//bivariate
	//equiconcern
	//staged SCE
}); 

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
			model.delVar(selected.name,dgname);
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
		this.model.on('change:selected_var1',this.setSelected,this)
        this.render();
    }, 
	setSelected:function(){
		var selected=this.model.get('selected_var1');
		console.log("setSelected on equations "+selected);
		if(selected) this.$el.datagrid('selectRecord',selected);
	},
    render: function() {
		var model=this.model;
		var scens=model.get("scens");
		var data=model.get("equations");
		data=data.map(function(x){return({name:x[0],scen1:x[scens[0]],scen2:x[scens[1]]});});
		this.$el.datagrid({
			data: data,
			idField:'name',
			columns:[[
			//TODO: sortable:true
			{field:'name',title:model.get('header')[0],width:220,editor:'text'},
			{field:'scen1',title:model.get('header')[scens[0]],width:300,editor:'text'},
			{field:'scen2',title:model.get('header')[scens[1]],width:300,editor:'text'}
			]],
			singleSelect:true,
			fit:true,
			onSelect: function(index,rowData){
				console.log("equations selected "+rowData.name);
				model.set("selected_var1",rowData.name);
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
									if(changes.scen1) data[index][scens[0]]=changes.scen1;
									if(changes.scen2) data[index][scens[1]]=changes.scen2;
									//TODO: allow renaming throughout the matrix	
									if(changes.name) data[index][0]=changes.name;
									model.set('equations',data);
                                },
			checkOnSelect:false,
			selectOnCheck:false
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
		console.log("setSelected on ranges "+selected);
		if(selected) this.$el.datagrid('selectRecord',selected);
	},
    render: function() {
		var model=this.model;
		var scens=model.get("scens");
		var data=model.get("ranges");
		//TODO: show modeled value automatically updated
		data=data.map(function(x){return({name:x[0],Lower:x[1],Min:x[2],Max:x[3],Upper:x[4]});});
		this.$el.datagrid({
			data: data,
			idField:'name',
			columns:[[
			//TODO: sortable:true
			{field:'name',title:model.get('header')[0],width:220,
				editor:{
					type:'combobox',
					options:{
						valueField:'value',
						textField:'value',
						//TODO: only allow the variable if it has the same value in each column?
						data:model.get("equations").map(function(x){return({value:x[0]})})
					}
				}
			},
			{field:'Lower',title:"Analysis min",width:100,editor:'text'},
			{field:'Min',title:"Min",width:100,editor:'text'},
			{field:'Max',title:"Max",width:100,editor:'text'},
			{field:'Upper',title:"Analysis max",width:100,editor:'text'}
			]],
			singleSelect:true,
			fit:true,
			onSelect: function(index,rowData){
				console.log("range selected "+rowData.name);
				model.set("selected_var1",rowData.name);
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
					}).on('keydown',function(e){
						if(e.keyCode==27){dg.datagrid('cancelEdit', index);$(document).off('keydown');return false;}
					});
				} else {
					$(ed.target).focus();
					$(ed.target).on('blur',function(e){
						e.stopPropagation();
						dg.datagrid('endEdit', index);
					}).on('keydown',function(e){
						if(e.keyCode==13){dg.datagrid('endEdit', index);return false;}
					}).on('keydown',function(e){
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

var SingleOutputPlot = Backbone.View.extend({
	initialize: function(args){
		this.output=args.output;
		this.model.on('change:ranges', this.render, this);
		this.model.on('change:equations', this.render, this);
		this.model.on('change:selected_var1',this.render,this);
		this.model.on('change:scens',this.render,this);
		var obj=this;
		this.$el.resizable({onStopResize:function(){obj.render()}});
	},
	render:function(){
		console.log("render SingleOutputPlot");
		var model=this.model;
		if(!model || !model.get("selected_var1")) return(this);
		var ranges0=model.getRanges(model.get("selected_var1"));
		//TODO: check if all limits are defined
		if(ranges0.length==0){
			$.messager.show({
			title:'Error',
			msg:"Range not found for variable "+model.get("selected_var1"),
			timeout:5000,
			showType:'slide'
			});
			return(this);
		}
		var ranges0={Min:ranges0[0][2],Max:ranges0[0][3]}
		if(!ranges0.Min) return(this)
		if(!ranges0.Max) return(this)
		this.$el.rplot("plotNPV",{					
					equations:model.selectEqns(model.get('scens')),
					x:model.get("selected_var1"),y:this.output,
					ranges0:ranges0,
					scens:$.grep(model.get('header'),function(e,i){
						return($.inArray(i,model.get("scens"))>-1);
					})
				})
		return this;
	}
});

var OutputStats = Backbone.View.extend({
    initialize: function(args){
		this.variable=args.variable;
		//if values doesn't exist yet, set it
		if(this.model.get(this.variable)==undefined) {
			var vals=[];
			vals[this.scens[1]]=NaN;
			vals[this.scens[0]]=NaN;
			this.model.set(this.variable,vals);
		}
		this.model.on('change:'+this.variable, function(){this.render()}, this);	
		this.model.on('change:equations', function(){this.evaluate()}, this);
        this.render(); //otherwise will be blank
    }, 
	variable: null,
	scens:[1,2],
	evaluate : function(){
		console.log("OutputStats calling evaluate for "+this.variable);
		this.model.evaluate(this.scens[1],this.variable); //scen
		this.model.evaluate(this.scens[0],this.variable); //baseline
	},
    render: function() {
		var vals=this.model.get(this.variable);
		console.log("OutputStats rendering "+this.variable);
		this.$el.html(_.template($("#outputstats_template").html(),{
			scen:this.model.get('header')[this.scens[1]],
			baseline:this.model.get('header')[this.scens[0]],
			scen_value:vals[this.scens[1]],
			baseline_value:vals[this.scens[0]],
			variable:this.variable
			}));
		return this;
	}
});


