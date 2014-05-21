
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

csvToEquations=function(csv){
//TODO: might be better to change all in one go
	// for (var i=0; i<csv.length; i++) {
		// equations.set(csv[i][0],csv[i][1]); //TODO: generalise to loading multiple sets of equations
	// }	
	csv.splice(0,1); //remove header
	equations.set("equations",csv)
	console.log(equations);
}

createEquationsTable=function(model){
	var data=model.get("equations");
	data=data.map(function(x){return({name:x[0],scen1:x[1],scen2:x[2]});});
	$("#dg-equations").datagrid({
		data: data,
		columns:[[
		{field:'name',title:'Name',width:220},
		{field:'scen1',title:'Scenario 1',width:300},
		{field:'scen2',title:'Scenario 2',width:300}
		]],
		fit:true
	});	
	$('#win-dg-equations').window('open')
	console.log("dg");
}


var Analysis = Backbone.Model.extend({
	defaults: {
		equations: [],
		header:[]
	},
	fromCSV:function(csv){
		console.log("fromCSV");
		//console.log(equations);
		//console.log(this);
		this.set({header:csv[0]})
		csv.splice(0,1); //remove header
		this.set({equations:csv});
		return this;
	},
	evaluate:function(column,variable){
		if(this.get('equations').length==0) return(this)
		dict={};
		for(i=0;i<this.get('equations').length;i++){
			dict[this.get('equations')[i][0]]=this.get('equations')[i][column]
		}
		var model=this;
		ocpu.call("evaluate",{expr:variable,equations:dict},function(session){session.getObject(function(data){ 
			console.log('evaluate is setting '+variable+' for column '+column);
			var vals=model.get(variable).slice(0); //clone, because otherwise this bypasses set
			if(vals==undefined) vals=[];
			vals[column]=data[0]; //assuming	 its a scalar
			model.set(variable,vals);
		})});
		return this;
	}
	//univariate
	//univariate plots
	//bivariate
	//equiconcern
	//staged SCE
}); 


var DGEquations = Backbone.View.extend({
    initialize: function(){
        this.model.on('change', this.render, this);
        ;this.render();
    }, 
	scens:[1,2],
    render: function() {
		//if(this.model.header==undefined) return(null);
		var model=this.model;
		var scens=this.scens;
		var data=model.get("equations");
		data=data.map(function(x){return({name:x[0],scen1:x[scens[0]],scen2:x[scens[1]]});});
		//console.log(this.$el);
		this.$el.datagrid({
			data: data,
			columns:[[
			//TODO: sortable:true
			{field:'name',title:model.get('header')[0],width:220,editor:'text'},
			{field:'scen1',title:model.get('header')[scens[0]],width:300,editor:'text'},
			{field:'scen2',title:model.get('header')[scens[1]],width:300,editor:'text'}
			]],
			fit:true,
			onClickCell: function(index,field,value){
				var dg=$(this);
				dg.datagrid('beginEdit', index);
				var ed = dg.datagrid('getEditor', {index:index,field:field});
				$(ed.target).focus();
				//TODO: hide other editors
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
									if(changes.scen1) data[index][scens[0]]=changes.scen1;
									if(changes.scen2) data[index][scens[1]]=changes.scen2;
									//TODO: allow renaming throughout the matrix	
									model.set('equations',data);
                                },
			checkOnSelect:false,
			selectOnCheck:false
		});
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


