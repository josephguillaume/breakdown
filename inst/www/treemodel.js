var TreeView = Backbone.View.extend({
	initialize: function(){
		this.model.on('change:equations', this.render, this);
		this.model.on('change:scens', this.render, this);
		this.model.on('change:showEquation', this.render, this);
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
			//onDblClickCell: edit_equation,
			onBeforeLoad: function(row,param){
				if (!row) {	// load top level rows
					param.id = 0;	// set id=0, indicate to load new page rows
				} else {
					param.name=row.name;
				}
				//TODO: subset model.selectEqns(model.get('scens'))
				param.equations=model.get("equations");
				param.showEquation=model.get("showEquation");
				param.open=Object.keys(model.get("expanded"));
			},
			onExpand:function(row){
				model.get("expanded")[row.id]=true;
			},
			onCollapse:function(row){
				delete model.get("expanded")[row.id]
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