
// http://mounirmesselmeni.github.io/2012/11/20/javascript-csv/
readCsv = function(files,handler){
   if (window.FileReader) {
		var reader = new FileReader();
		if(files.length==0) return null;
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
		header:["Variable"],
		ranges:[],
		univariate_crossover:[],
		scens:[1,2],
		selected_var1: null,
		ranges_cols:["Variable","Lower","Min","Best","Max","Upper"],
		showEquation:false
	},
	EquationsfromCSV:function(csv){
		console.log("EquationsfromCSV");
		this.set('header',csv[0])
		csv.splice(0,1); //remove header
		this.set('equations',csv);
		return this;
	},
	AllToCSV:function(){
		// Merge equations,notes,ranges
		var eqns=this.get('equations').map(function(arr){return arr.slice();});
		var vars_eqns=eqns.map(function(x){return x[0]});
		var ranges=this.get('ranges').map(function(arr){return arr.slice();});
		var vars_ranges=ranges.map(function(x){return x[0]});
		var head_eqns=this.get("header").slice();
		head_eqns.splice(0,1);
		var out=[[].concat(
			this.get("ranges_cols"),
			["bestguess","bounds","direction","is.problem"],
			head_eqns
		)];
		$.each(vars_eqns,function(i,v){
			var row_eqns=eqns[i].slice();
			var var_name=row_eqns.splice(0,1);
			var row_notes=["","","","",""];
			var row_ranges=["","","","",""];
			var idx_ranges=vars_ranges.indexOf(v);
			if(idx_ranges > -1){
				row_ranges=ranges[idx_ranges].slice();
				row_ranges.splice(0,1);
				for(i=0;i<5;i++){if(!row_ranges[i]){row_ranges[i]=""}}
			}
			out.push([].concat([var_name],row_ranges,row_notes,row_eqns));
		});
		var csv=out.map(function(row){return row.map(function(x){return '"'+x+'"'}).join(";")}).join("\n");
		return csv
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
			// For each row, return name and desired indices
			var row=indices.map(function(i){return x[i]});
			row.unshift(x[0]);
			return row;
		});
		return(eqns);
	},
	getRanges:function(vars,asArray){
		if(!vars) return(null);
		asArray = typeof asArray !== 'undefined' ? asArray : true;
		if(!$.isArray(vars)) var vars=[vars];
		var ranges=this.get('ranges').map(function(arr){return arr.slice();});
		ranges=$.grep(ranges,function(e,i){
				// Return appropriate elements
				return($.inArray(e[0],vars)>-1);
			})
		if(asArray){ return(ranges) };
		ranges = {
			Variable:ranges.map(function(x){return x[0]}),
			Lower:ranges.map(function(x){return parseFloat(x[1])}),
			Min:ranges.map(function(x){return parseFloat(x[2])}),
			Best:ranges.map(function(x){return parseFloat(x[3])}),
			Max:ranges.map(function(x){return parseFloat(x[4])}),
			Upper:ranges.map(function(x){return parseFloat(x[5])}),
		};
		return ranges;
	},	
	normalise:function(x,variable){
		val=parseFloat(x);
		ranges=_.object(this.get("ranges_cols"),this.getRanges(variable)[0]);
		if(!ranges.Best) return(NaN)
		if(!ranges.Min) return(NaN)
		if(!ranges.Max) return(NaN)
		if(Math.abs(x-ranges.Best) < 1e-5){return(0)}
		if(x>ranges.Best){return (x-ranges.Best)/(ranges.Max-ranges.Best)}
		if(x>ranges.Best){return (ranges.Best-x)/(ranges.Best-ranges.Min)}
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
	},
	univariateCrossover:function(output){
		var model=this;
		if(model.get('ranges').length==0) return(this);
		var ranges= {
			Variable:model.get('ranges').map(function(x){return x[0]}),
			Lower:model.get('ranges').map(function(x){return parseFloat(x[1])}),
			Upper:model.get('ranges').map(function(x){return parseFloat(x[5])})
		};
		
		console.log("univariateCrossover");
		var req=ocpu.rpc("univariateCrossover",{
				'equations.scen':model.selectEqns([model.get('scens')[0]]),
				'equations.baseline':model.selectEqns([model.get('scens')[1]]),
				'var':output,
				ranges:ranges
			},function(data){
				//TODO: cannot store results for more than one output
				model.set('univariate_crossover',data);
			})
		req.fail(function(){
			$.messager.show({
					title:'Error',
					msg:req.responseText,
					timeout:5000,
					showType:'slide'
					});
			model.set('univariate_crossover',[]);
		});
	}
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
						data:model.get("equations").map(function(x){return({value:x[0]})})
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
		if(ranges0.length==0){
			$.messager.show({
			title:'Error',
			msg:"Range not found for variable "+model.get("selected_var1"),
			timeout:5000,
			showType:'slide'
			});
			return(this);
		}
		ranges0=_.object(model.get("ranges_cols"),ranges0[0]);
		this.$el.rplot("plotNPV",{					
					equations:model.selectEqns(model.get('scens')),
					x:model.get("selected_var1"),y:this.output,
					ranges0:ranges0,
					scens:model.get("scens").map(function(i){return model.get('header')[i]})
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

var UnivariateTable = Backbone.View.extend({
    initialize: function(args,output){
		this.output=args.output;
		
		this.uniSliders=new RangeSliders({model:this.model,el:this.$el,editRange:editRange_placeholder});
		//uniSliders will be updated on render here instead
		this.uniSliders.stopListening();
		
		this.model.on('change:ranges', this.calc, this);
		this.model.on('change:equations', this.calc, this);
		this.model.on('change:selected_var1',this.setselected,this);
		this.model.on('change:scens',this.calc,this);
		this.model.on('change:univariate_crossover', this.render, this);
		this.model.on('change:ranges', this.render, this);
		this.render();
	},
	calc:function(){
		this.model.univariateCrossover(this.output);
		return this;
	},
	setselected:function(){
		this.$el.find('input[name="selectedVar"][value="' + this.model.get('selected_var1') + '"]').prop('checked', true);
	},
    render: function() {
		console.log("render UnivariateTable "+this.output);
		var model=this.model;
		data=model.get('univariate_crossover');
		// Calculate data
		var tab=$.map(model.get('ranges'),function(e,i){
			var perc_to_limit=model.normalise(data[i],e[0]);
			var best = model.get('ranges')[i][3];
			var perc_change=null;
			if(best && data[i]) perc_change=(data[i]-best)/best*100;
			var concernClass=null;
			if(1-perc_to_limit>0.75){ concernClass="highconcern"
			} else if(1-perc_to_limit>0.25){concernClass="midconcern"
			} else { concernClass="lowconcern"}
			var row=e.concat(data[i],perc_to_limit,perc_change,concernClass);
			return _.object(["Variable","Lower","Min","Best","Max","Upper","Break","PercToLimit","PercChange","concernClass"],row);
		})
		// Call template
		this.$el.html(_.template($("#univTable_template").html(),{
			tab:tab,
			id:this.$el.prop("id")
		}));
		this.uniSliders.render();
		this.$el.find("input:radio").on('change',function(){model.set('selected_var1',this.value)});
		this.setselected();
		return this;
	}
});

setDefault=function(model){
	var req=ocpu.rpc("getBottom",{equations:model.get("equations")},function(data){ 
		var ranges=model.get('ranges').map(function(arr){return arr.slice();});
		var current_names=ranges.map(function(x){return x[0]});
		var new_names = _.filter(data,function(v){return !_.contains(current_names,v)})
		var new_items=new_names.map(function(v){return [v]});
		var eqns=model.get('equations');
		$.each(eqns,function(i,v){
			w=new_names.indexOf(v[0]);
			if(w > -1 && !isNaN(parseFloat(v[1]))){
				new_items[w][3]=v[1]
				new_items[w][1]=v[1]*0.01
				new_items[w][5]=v[1]*10
			}
		});
		ranges=ranges.concat(new_items);
		model.set('ranges',ranges);
	});
	req.fail(function(){console.log(req.responseText)});
}

var BivariateAnalysis = Backbone.Model.extend({
	defaults: {
		n:10,
		vars:[],
		output:null,
		flip:false,
		bivariate_result:null,
		base:null
	},
	initialize:function(){
		//bivariateCrossover is called if any of the attributes change
		this.on('change:n',this.bivariateCrossover,this);
		this.on('change:vars',this.bivariateCrossover,this);
		this.on('change:output',this.bivariateCrossover,this);
		this.listenTo(this.get("base"),'change:ranges', this.bivariateCrossover, this);
		this.listenTo(this.get("base"),'change:equations', this.bivariateCrossover, this);
		this.listenTo(this.get("base"),'change:scens',this.bivariateCrossover,this);		
	},
	bivariateCrossover: function(){
		if(!this.get("output")) return this;
		if(this.get("vars").length!=2) return this;
		console.log("bivariateCrossover");
		var base=this.get("base");
		var biv=this;
		var ranges=base.getRanges(this.get("vars"),false);
		var req=ocpu.call("bivariateCrossover",{
				'equations.scen':base.selectEqns([base.get('scens')[0]]),
				'equations.baseline':base.selectEqns([base.get('scens')[1]]),
				'var':this.get("output"),
				ranges:ranges,
				n:this.get("n")
		},function(session){
			biv.set("bivariate_result",session)
		})
	}
});

var BivOutputPlot = Backbone.View.extend({
    initialize: function(args){

		this.listenTo(this.model,'change:bivariate_result', this.render, this);
		this.listenTo(this.model,'change:flip', this.render, this);
		//TODO: changing Min,Max,Best should just involve new plot
		var obj=this;
		this.$el.resizable({onStopResize:function(){obj.render()}});
	},
    render: function() {
		var pom=this.model.get("bivariate_result");
		if(!pom) return this;
		console.log("BivOutputPlot render");
		var ranges=this.model.get("base").getRanges(this.model.get("vars"),false);
		var req=this.$el.rplot("biplot",{
					pom:pom,
					ranges:ranges,
					flip:this.model.get("flip")
		})
		req.fail(function(){console.log(req.responseText)});
		return this;
	}
});

var BivRadioButtonTable = Backbone.View.extend({
	//model is a BivariateAnalysis
    initialize: function(args){
		this.listenTo(this.model.get("base"),'change:ranges',this.render,this);
		this.listenTo(this.model,'change:vars',this.setselected,this);
		this.inputId=this.$el.prop("id")+"_var1";
		this.inputId2=this.$el.prop("id")+"_var2";
		
		this.sliders=new RangeSliders({model:this.model.get("base"),el:this.$el,editRange:editRange_placeholder});
		//sliders will be updated on render here instead
		this.sliders.stopListening();
	},
	setselected:function(){
		this.$el.find('input[name="'+this.inputId+'"][value="' + 
			this.model.get('vars')[0] + '"]').prop('checked', true);
		this.$el.find('input[name="'+this.inputId2+'"][value="' + 
			this.model.get('vars')[1] + '"]').prop('checked', true);
	},
    render: function() {
		console.log("render BivRadioButtonTable")
		var model=this.model;
		var ranges=model.get("base").get('ranges');
		// Call template
		this.$el.empty().html(_.template($("#BivariateRadioButtonTable_template").html(),{
			ranges:ranges,
			inputId:this.inputId,
			inputId2:this.inputId2,
			id:this.$el.prop("id")
		}));
		this.sliders.render();
		//should be listenTo?
		this.$el.find("input:radio[name='"+this.inputId+"']").on('change',function(){
			model.set('vars',[this.value,model.get('vars')[1]])});
		this.$el.find("input:radio[name='"+this.inputId2+"']").on('change',function(){
			model.set('vars',[model.get('vars')[0],this.value])});
		this.setselected();
		return this;
	}
});


var editRange_placeholder=function(this_var){
	//TODO
	$('#win').html(analysis.getRanges(this_var));
	$('#win').window('open');
}
			
			
// Creates a complete set of sliders - can't change each variable separately anyway in model,
//  so not worth having individual sliders
var RangeSliders = Backbone.View.extend({
    initialize: function(args){
		this.editRange=args.editRange;
		this.listenTo(this.model,'change:ranges',this.render,this);
		//this.render();
	},
    render: function(){
		// TODO: avoid redrawing if only min and max change
		console.log('RangeSliders render '+this.$el.prop("id"));
		var model=this.model;
		var editRange=this.editRange;
		var prefix=this.$el.prop("id")+"_";
		//If there are existing sliders, remove them
		//https://github.com/egorkhmelev/jslider/issues/39
		this.$el.find("input[type='slider']").off();
		this.$el.find("input[type='slider']").removeData("jslider");
		this.$el.find("input[type='slider']+.jslider").remove();
		// Create sliders
		this.$el.find("input[type='slider']").each(function(){
			var id=$(this).prop('id').replace(prefix,"");
			var range=model.getRanges(id,asArray=false); //object is a copy
			if(isNaN(range.Min)) range.Min=range.Lower;
			if(isNaN(range.Max)) range.Max=range.Upper;
			//Define scale
			var scale=[];
			for (var i = 0; i <= 15+1; i++) {scale.push("|");};
			scale[Math.round((range.Best[0]-range.Lower[0])/(range.Upper[0]-range.Lower[0])*15.0)+1]=range.Best;
			
			$(this).slider({ range:true, from: range.Lower[0], to: range.Upper[0], step: (range.Upper[0]-range.Lower[0])/250, round: false, 
				scale:scale,format: { format: "#,##0.#####", locale: 'us' }, dimension:'', skin: "round",
				callback:function(value){
					//Edit model's ranges and reset it
					var data=model.get('ranges').map(function(arr){return arr.slice();});
					index=data.map(function(x){return x[0]}).indexOf(id);
					var vals = value.split(/;/, 2);
					data[index][model.get("ranges_cols").indexOf("Min")]=vals[0];
					data[index][model.get("ranges_cols").indexOf("Max")]=vals[1];
					model.set('ranges',data);
				}
			})
			$(this).slider("value",range.Min[0],range.Max[0]);
			$(this).next(".jslider").find(".jslider-value-to").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-value").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-label-to").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-label").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-scale span:not(:empty())").on('click',function(){editRange(id)});
		})
		return this;
	}
});


var MultivarCrossover = Backbone.Model.extend({
	defaults: {
		vars:[],
		output:null,
		multivar_result:null,
		base:null
	},
	crossoverEquiconcern: function(){
		//analysis is to be run on request
		if(!this.get("output")) return this;
		console.log("crossoverEquiconcern");
		var base=this.get("base");
		var model=this;
		var ranges=base.getRanges(this.get("vars"),false);
		var req=ocpu.rpc("crossoverEquiconcern",{
				'equations.scen':base.selectEqns([base.get('scens')[0]]),
				'equations.baseline':base.selectEqns([base.get('scens')[1]]),
				'var':this.get("output"),
				ranges:ranges
		},function(result){
			model.set("multivar_result",result)
		});
		req.fail(function(){
			$.messager.show({
					title:'Error',
					msg:req.responseText,
					timeout:5000,
					showType:'slide'
					});
			model.set("multivar_result",null);
		});
		return this;
	}
});

var MultivarCheckboxTable = Backbone.View.extend({
	//model is a MultivarCrossover
    initialize: function(args){
		this.template=_.template(args.template.html());
		this.listenTo(this.model.get("base"),'change:ranges',this.render,this);
		this.listenTo(this.model,'change:vars',this.setselected,this);
		this.inputId=this.$el.prop("id")+"_var";
		
		this.sliders=new RangeSliders({model:this.model.get("base"),el:this.$el,editRange:editRange_placeholder});
		//sliders will be updated on render here instead
		this.sliders.stopListening();
	},
	setselected:function(){
		var view=this;
		view.$el.find('input[name="'+this.inputId+'"]').prop('checked',false);
	    _.each(view.model.get('vars'),function(val,i,l){
			view.$el.find('input[name="'+view.inputId+'"][value="' + val + '"]').prop('checked', true);
		});
	},
    render: function() {
		console.log("render MultivarCheckboxTable")
		var model=this.model;
		var jq=this.$el;
		var ranges=model.get("base").get('ranges');
		// Call template
		jq.html(this.template({
			ranges:ranges,
			inputId:this.inputId,
			id:this.$el.prop("id")
		}));
		this.sliders.render();
		//should be listenTo?
		jq.find("input:checkbox[name='"+this.inputId+"']").on('change',function(){
			var checked=[];
			jq.find("input:checked").each(function(){checked.push(this.value)});
			model.set('vars',checked)
		});
		this.setselected();
		return this;
	}
});

var MultivarResultsTable = Backbone.View.extend({
	//model is a MultivarCrossover
    initialize: function(args){
		this.template=_.template(args.template.html());
		this.listenTo(this.model.get("base"),'change:univariate_crossover',this.render,this);
		this.listenTo(this.model,'change:multivar_result',this.render,this);
	},
    render: function() {
		var model=this.model
		var multvar_result=model.get("multivar_result");
		if(!multvar_result){
			this.$el.html("No results to display");
			return this;
		}
		//TODO: more efficient way of subsetting univar
		var variables=model.get("base").get('ranges').map(function(x){return x[0]});
		var varIdx=model.get("vars").map(function(v){return variables.indexOf(v)});
		var univar=model.get("base").get("univariate_crossover");
		var results={
			Variable:model.get("vars"),
			univar:varIdx.map(function(i){return univar[i]}),
			multvar:multvar_result.values.slice(0)
		}
		var ranges=model.get("base").getRanges(model.get("vars"),false);
		results.Min=ranges.Min;
		results.Max=ranges.Max;
		results.Best=ranges.Best;
		results.change=results.Best.map(function(e,i){return results.multvar[i]-e});
		var names=Object.keys(results);
		//Convert from object of arrays to array of objects
		results=_.zip.apply(_, _.toArray(results)).map(function(x){return _.object(names,x)});
		console.log(results);
		
		this.$el.html(this.template({
			results:results,
			loc:model.get("multivar_result").loc
		}));
	}
});


downloadCSV=function(model){
	var data=model.AllToCSV();
	window.open('data:text/csv;charset=utf8,' + encodeURIComponent(data))
}

var SelectScens = Backbone.View.extend({
	//model is an Analysis
    initialize: function(args){
		//0-based index of model.scens that is linked to this view
		this.wscen=args.wscen;
		this.listenTo(this.model,"change:header",this.render);
		this.listenTo(this.model,"change:scens",this.render);
		this.render();
	},
	render: function(){
		var model=this.model;
		var view=this;
		var opts=model.get("header").map(function(e,i){return {id:i,text:e}})
		opts.splice(0,1);
		if(opts.length==0) opts=[{id:1,text:""},{id:2,text:""}];
		this.$el.combobox({
			valueField:'id',
			textField:'text',
			selectOnNavigation:true,
			data:opts,
			onChange:function(oldval,newval){
				if(oldval==newval) return null;
				if(newval=="") return null;
				if(!newval) return null;
				if(!isNaN(parseInt(newval))) return null;
				var idx=model.get("header").indexOf(newval);
				if(idx>0){
					view.$el.next().find("input").toggleClass("unknown-scen",false);
					var scens=model.get('scens').slice();
					scens[view.wscen]=idx;
					model.set('scens',scens);
				} else {
					view.$el.next().find("input").toggleClass("unknown-scen",true);
				}
			},
			onSelect:function(rec){
				if(!rec) return null;
				view.$el.next().find("input").toggleClass("unknown-scen",false);
				var scens=model.get('scens').slice();
				scens[view.wscen]=rec.id;
				model.set('scens',scens);
			}
		});
		this.$el.combobox('select',model.get('scens')[view.wscen]);
	}
});

addScens=function(model,scen_vals){
	_.each(scen_vals,function(e,wscen){
		var header=model.get('header').slice();
		if(header.indexOf(e)==-1){
			newidx=header.length;
			//create a blank column
			//change directly to not trigger events
			var equations=model.get('equations');
			for(i=0;i<equations.length;i++){if(!equations[i][newidx]){equations[i][newidx]=""}}
			//then add it to the header
			header.push(e);
			model.set('header',header);
			//and set selected scenarios
			var scens=model.get('scens').slice();
			scens[wscen]=newidx;
			model.set('scens',scens);
	}});
};
